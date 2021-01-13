import { ethers, providers } from 'ethers';
import { BigNumber } from 'bignumber.js';
import { SideChainAugur, SideChainShareToken, SideChainAugurTrading, SideChainFillOrder, SideChainProfitLoss, SideChainZeroXTrade, SideChainSimulateTrade } from './ContractInterfaces';
import { stringTo32ByteHex } from './HelperFunctions';
import { Contracts, ContractData } from './Contracts';
import { Dependencies } from './GenericContractInterfaces';
import { SDKConfiguration, mergeConfig, ArbitrumDeploy, TestDeploy, SideChainExternalAddresses, validConfigOrDie, deepCopy } from '@augurproject/utils';
import { updateConfig } from '@augurproject/artifacts';
import { Block, BlockTag } from '@ethersproject/providers';
import { EthersProvider } from '@augurproject/ethersjs-provider';
import {EthersFastSubmitWallet} from './EthersFastSubmitWallet';
import { ContractDependenciesEthers } from '@augurproject/contract-dependencies-ethers';



interface BlockGetter {
    getBlock(blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>, includeTransactions?: boolean): Promise<Block>;
}

export async function deploySideChain(
    env: string,
    config: SDKConfiguration,
    account: Account,
    contracts: Contracts,
): Promise<SDKConfiguration> {
    config = deepCopy(config);
    switch (config.deploy?.sideChain?.name) {
        case 'test': return deployTestSideChain(env, config, account, contracts);
        case 'arbitrum': return deployArbitrumSideChain(env, config, account, contracts);
        case 'matic': throw Error('Matic sidechain not yet implemented.')
        default: throw Error('Must specify deploy.sideChain.name in config.')
    }
}

async function deployArbitrumSideChain(
    env: string,
    config: SDKConfiguration,
    account: Account,
    contracts: Contracts,
): Promise<SDKConfiguration> {
    const { signer: ethereumSigner } = await setupEthereumDeployer(config, account);
    const { signer: arbitrumSigner, dependencies: arbitrumDependencies, provider: arbitrumProvider } = await setupSideChainDeployer(config, account);

    console.log('Deploying contracts to Ethereum, if not yet deployed.');
    let { pushBridge, bridge } = (config.deploy.sideChain.specific || {}) as ArbitrumDeploy;
    if (!pushBridge) pushBridge = await construct(config, ethereumSigner, contracts.get('AugurPushBridge'));
    if (!bridge) bridge = await construct(config, ethereumSigner, contracts.get('ArbitrumBridge'), [pushBridge, config.addresses.Augur]);

    console.log('Deploying contracts to Arbitrum, if not yet deployed.');
    let { MarketGetter: marketGetter } = config.deploy?.sideChain?.sideChainExternalAddresses || {};
    if (!marketGetter) marketGetter = await construct(config, arbitrumSigner, contracts.get('ArbitrumMarketGetter'));

    config =  validConfigOrDie(mergeConfig(config, {
        deploy: {
            sideChain: {
                sideChainExternalAddresses: {
                    MarketGetter: marketGetter,
                },
                specific: {
                    bridge,
                    pushBridge
                }
            }
        }
    }));

    return await deploySideChainCore(env, config, arbitrumDependencies, arbitrumProvider, arbitrumSigner, contracts);
}

async function deployTestSideChain(
    env: string,
    config: SDKConfiguration,
    account: Account,
    contracts: Contracts,
): Promise<SDKConfiguration> {
    const { signer: ethereumSigner, dependencies: ethereumDependencies, provider: ethereumProvider } = await setupEthereumDeployer(config, account);

    console.log('Deploying contracts to Ethereum, if not yet deployed.');
    let { pushBridge } = (config.deploy.sideChain.specific || {}) as TestDeploy;
    let { Cash: cash, MarketGetter: marketGetter } = config.deploy?.sideChain?.sideChainExternalAddresses || {};
    if (!pushBridge) pushBridge = await construct(config, ethereumSigner, contracts.get('AugurPushBridge'));
    if (!cash) cash = await construct(config, ethereumSigner, contracts.get('Cash'));
    if (!marketGetter) {
        marketGetter = await construct(config, ethereumSigner, contracts.get('TestBridgeContract'), [
            cash,
            config.addresses.OICash,
            config.addresses.Universe,
            pushBridge
        ]);
    }

    config =  validConfigOrDie(mergeConfig(config, {
        deploy: {
            sideChain: {
                sideChainExternalAddresses: {
                    Cash: cash,
                    MarketGetter: marketGetter,
                    RepFeeTarget: marketGetter,
                    ZeroXExchange: config.addresses.Exchange
                }
            }
        }
    }));

    return await deploySideChainCore(env, config, ethereumDependencies, ethereumProvider, ethereumSigner, contracts);
}

async function deploySideChainCore(
    env: string,
    config: SDKConfiguration,
    dependencies: Dependencies<BigNumber>,
    provider: BlockGetter,
    signer: ethers.Signer,
    contracts: Contracts,
): Promise<SDKConfiguration> {
    const { Cash: cash, MarketGetter: marketGetter, RepFeeTarget: repFeeTarget } = config.deploy?.sideChain?.sideChainExternalAddresses || {};
    if (!cash || !marketGetter || repFeeTarget) throw Error('Must populate deploy.sideChain.sideChainExternalAddresses in config.');

    const { name, sideChainExternalAddresses } = config.deploy.sideChain;
    const uploadBlockNumber = await getBlockNumber(provider);

    const addresses = await deployContracts(config, signer, contracts);
    await registerSideChainContracts(dependencies, addresses, sideChainExternalAddresses);

    config = validConfigOrDie(mergeConfig(config, { sideChain: {
        name,
        uploadBlockNumber,
        addresses: {
            Augur: addresses['SideChainAugur'],
            Universe: config.addresses.Universe,
            ShareToken: addresses['SideChainShareToken'],
            Cash: cash,
            Affiliates: addresses['Affiliates'],
            AugurTrading: addresses['SideChainAugurTrading'],
            FillOrder: addresses['SideChainFillOrder'],
            SimulateTrade: addresses['SideChainSimulateTrade'],
            ZeroXTrade: addresses['SideChainZeroXTrade'],
            ProfitLoss: addresses['SideChainProfitLoss'],
            MarketGetter: marketGetter,
            RepFeeTarget: repFeeTarget
        }
    }}));

    if (config.deploy.writeArtifacts) {
        await updateConfig(env, config);
    }

    return config;
}

export interface Account {
    privateKey: string;
    address: string;
    initialBalance?: number;
}

export function accountFromPrivateKey(key: string): Account {
    key = cleanKey(key);
    return {
        privateKey: key,
        address: ethers.utils.computeAddress(key),
    }
}

function cleanKey(key: string): string {
    if (key.slice(0, 2) !== '0x') {
        key = `0x${key}`;
    }
    if (key[key.length - 1] === '\n') {
        key = key.slice(0, key.length - 1)
    }
    return key;
}

export async function makeSigner(account: Account, provider: EthersProvider) {
    return EthersFastSubmitWallet.create(account.privateKey, provider);
}

export function makeDependencies(
    account: Account,
    provider: EthersProvider,
    signer: EthersFastSubmitWallet
) {
    return new ContractDependenciesEthers(provider, signer, account.address);
}

async function setupEthereumDeployer(config: SDKConfiguration, account: Account) {
    const { http } = config.ethereum || {};
    if (!http) throw Error('Must specify ethereum.http');
    return setupDeployer(http, config, account);
}

async function setupSideChainDeployer(config: SDKConfiguration, account: Account) {
    const { http } = config.sideChain || {};
    if (!http) throw Error('Must specify sideChain.http');
    return setupDeployer(http, config, account);
}

async function setupDeployer(http: string, config: SDKConfiguration, account: Account) {
    const { rpcRetryCount, rpcRetryInterval, rpcConcurrency } = config.ethereum;
    const jsonProvider = new providers.JsonRpcProvider(http);
    const provider = new EthersProvider(
        jsonProvider,
        rpcRetryCount,
        rpcRetryInterval,
        rpcConcurrency,
    );
    if (config.gas?.override) {
        if (config.gas?.price) provider.overrideGasPrice = ethers.BigNumber.from(config.gas.price);
        if (config.gas?.limit) provider.gasLimit = ethers.BigNumber.from(config.gas.limit);
    }

    const signer = await makeSigner(account, provider);
    const dependencies = await makeDependencies(account, provider, signer);

    return { signer, dependencies, provider };
}

interface Addresses { [contractName: string]: string }

async function registerSideChainContracts(
    dependencies: Dependencies<BigNumber>,
    addresses: Addresses,
    sideChainExternalAddresses: SideChainExternalAddresses
) {
    const sideChainAugur = new SideChainAugur(dependencies, addresses['SideChainAugur']);
    const sideChainAugurTrading = new SideChainAugurTrading(dependencies, addresses['SideChainAugurTrading']);

    await sideChainAugur.registerContract(stringTo32ByteHex('Cash'), sideChainExternalAddresses.Cash);
    await sideChainAugur.registerContract(stringTo32ByteHex('ShareToken'), addresses['SideChainShareToken']);
    await sideChainAugur.registerContract(stringTo32ByteHex('Affiliates'), addresses['Affiliates']);
    await sideChainAugur.registerContract(stringTo32ByteHex('MarketGetter'), sideChainExternalAddresses.MarketGetter);
    await sideChainAugur.registerContract(stringTo32ByteHex('RepFeeTarget'), sideChainExternalAddresses.RepFeeTarget);

    await sideChainAugurTrading.registerContract(stringTo32ByteHex('FillOrder'), addresses['SideChainFillOrder']);
    await sideChainAugurTrading.registerContract(stringTo32ByteHex('ZeroXTrade'), addresses['SideChainZeroXTrade']);
    await sideChainAugurTrading.registerContract(stringTo32ByteHex('ProfitLoss'), addresses['SideChainProfitLoss']);
    await sideChainAugurTrading.registerContract(stringTo32ByteHex('ZeroXExchange'), sideChainExternalAddresses.ZeroXExchange);

    const sideChainShareToken = new SideChainShareToken(dependencies, addresses['SideChainShareToken']);
    const sideChainFillOrder = new SideChainFillOrder(dependencies, addresses['SideChainFillOrder']);
    const sideChainZeroXTrade = new SideChainZeroXTrade(dependencies, addresses['SideChainZeroXTrade']);
    const sideChainProfitLoss = new SideChainProfitLoss(dependencies, addresses['SideChainProfitLoss']);
    const sideChainSimulateTrade = new SideChainSimulateTrade(dependencies, addresses['SideChainSimulateTrade']);

    await sideChainShareToken.initialize(sideChainAugur.address);
    await sideChainFillOrder.initialize(sideChainAugur.address, sideChainAugurTrading.address);
    await sideChainZeroXTrade.initialize(sideChainAugur.address, sideChainAugurTrading.address);
    await sideChainProfitLoss.initialize(sideChainAugur.address, sideChainAugurTrading.address);
    await sideChainSimulateTrade.initialize(sideChainAugur.address, sideChainAugurTrading.address);
}

async function deployContracts(config: SDKConfiguration, signer: ethers.Signer, contracts: Contracts): Promise<Addresses> {
    console.log('Deploying contracts.')
    const contractsToDeploy = [
        'SideChainAugur',
        'SideChainShareToken',
        'SideChainAugurTrading',
        'SideChainFillOrder',
        'SideChainProfitLoss',
        'SideChainZeroXTrade',
        'SideChainSimulateTrade',
        'Affiliates',
    ];

    const addresses = {};
    for (const contractName of contractsToDeploy) {
        const contract = contracts.get(contractName);
        const constructorArgsMap = {
            'SideChainAugurTrading': [ addresses['SideChainAugur'] ],
        };
        const constructorArgs = constructorArgsMap[contractName] || [];
        addresses[contractName] = await construct(config, signer, contract, constructorArgs);
    }
    return addresses;
}

async function construct(
    config: SDKConfiguration,
    signer: ethers.Signer,
    contract: ContractData,
    constructorArgs: string[] = null,
    overrides: ethers.PayableOverrides = null
): Promise<string> {
    constructorArgs = constructorArgs || [];
    overrides = overrides || {};
    console.log(`Upload contract: ${contract.contractName}`);

    if (config.gas?.override) {
        const {limit, price} = config.gas;
        if (limit) overrides.gasLimit = limit;
        if (price) overrides.gasPrice = price;
    }
    const factory = new ethers.ContractFactory(contract.abi, contract.bytecode, signer);
    const contractObj = await factory.deploy(...constructorArgs, overrides);
    await contractObj.deployed();
    console.log(`Uploaded contract: ${contract.contractName}: \"${contractObj.address}\"`);
    return contractObj.address;
}

async function getBlockNumber(provider: BlockGetter): Promise<number> {
    return provider.getBlock('latest').then(block => block.number);
}
