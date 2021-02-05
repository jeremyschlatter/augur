import { ethers, providers } from 'ethers';
import { BigNumber } from 'bignumber.js';

import { SDKConfiguration, mergeConfig, ArbitrumDeploy, TestDeploy, SideChainExternalAddresses, validConfigOrDie, deepCopy, SpecificArbitrum } from '@augurproject/utils';
import { EthersProvider } from '@augurproject/ethersjs-provider';
import { updateConfig, abi as ABI } from '@augurproject/artifacts';
import { Block, BlockTag } from '@ethersproject/providers';
import { ContractDependenciesEthers } from '@augurproject/contract-dependencies-ethers';

import {sleep, stringTo32ByteHex} from './HelperFunctions';
import { Contracts, ContractData } from './Contracts';
import { Dependencies } from './GenericContractInterfaces';
import { EthersFastSubmitWallet } from './EthersFastSubmitWallet';

interface BlockGetter {
    getBlock(blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>, includeTransactions?: boolean): Promise<Block>;
}

const ARBITRUM_OVERRIDES = {
    gasPrice: 1,
    gasLimit: 21000000
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
    console.log('Deploying contracts to Ethereum, if not yet deployed.');
    const { signer: ethereumSigner } = await setupEthereumDeployer(config, account, {});
    const specific: ArbitrumDeploy = (config.deploy.sideChain.specific || {}) as ArbitrumDeploy;
    let { pushBridge, bridge } = specific;
    const { arbChain, globalInbox } = specific;
    if (!pushBridge) pushBridge = await construct(config, ethereumSigner, contracts.get('AugurPushBridge'));
    if (!bridge) bridge = await construct(config, ethereumSigner, contracts.get('ArbitrumBridge'), [pushBridge, config.addresses.Augur]);
    if (!arbChain) throw Error('Must specify deploy.sideChain.specific.arbChain in config.')

    console.log('Deploying contracts to Arbitrum, if not yet deployed.');
    const { signer: arbitrumSigner, dependencies: arbitrumDependencies, provider: arbitrumProvider } = await setupSideChainDeployer(config, account, ARBITRUM_OVERRIDES);
    let { MarketGetter: marketGetter } = config?.sideChain?.addresses || {};
    if (!marketGetter) marketGetter = await construct(config, arbitrumSigner, contracts.get('ArbitrumMarketGetter'), [bridge], ARBITRUM_OVERRIDES);

    config =  validConfigOrDie(mergeConfig(config, {
        deploy: {
            sideChain: {
                sideChainExternalAddresses: {
                    MarketGetter: marketGetter,
                    Cash: config.addresses.OICash, // TODO must reflect the oicash for this collateral, in the matching para
                    RepFeeTarget: marketGetter,
                    ZeroXExchange: config.addresses.Exchange // TODO is this correct?
                }
            }
        },
        sideChain: {
            addresses: {
                MarketGetter: marketGetter,
                Cash: config.addresses.OICash, // TODO must reflect the oicash for this collateral, in the matching para
                RepFeeTarget: marketGetter,
                ZeroXExchange: config.addresses.Exchange, // TODO is this correct?
                Bridge: bridge,
            },
            specific: {
                arbChain,
            }
        }
    }));

    if (globalInbox) {
        console.log('Registering global inbox and arbitrum chain address with bridge.')
        const bridgeContract = new ArbitrumBridge(bridge, ethereumSigner);
        await bridgeContract.registerArbchain(arbChain, globalInbox, marketGetter);
    } else {
        console.log('No global inbox provided so NOT registering with bridge.')
    }

    return await deploySideChainCore(env, config, arbitrumDependencies, arbitrumProvider, arbitrumSigner, contracts, ARBITRUM_OVERRIDES);
}

async function deployTestSideChain(
    env: string,
    config: SDKConfiguration,
    account: Account,
    contracts: Contracts,
): Promise<SDKConfiguration> {
    const { signer: ethereumSigner, dependencies: ethereumDependencies, provider: ethereumProvider } = await setupEthereumDeployer(config, account, {});

    console.log('Deploying contracts to Ethereum, if not yet deployed.');
    let { pushBridge } = (config.deploy.sideChain.specific || {}) as TestDeploy;
    let { MarketGetter: marketGetter } = config?.sideChain?.addresses || {};
    let { Cash: cash } = config.deploy?.sideChain?.sideChainExternalAddresses || {};
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
        },
        sideChain: {
            addresses: {
                Cash: cash,
                MarketGetter: marketGetter,
                RepFeeTarget: marketGetter,
                ZeroXExchange: config.addresses.Exchange
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
    overrides?: ethers.Overrides,
): Promise<SDKConfiguration> {
    const { Cash: cash, RepFeeTarget: repFeeTarget } = config.deploy?.sideChain?.sideChainExternalAddresses || {};
    if (!cash || !repFeeTarget) throw Error('Must populate deploy.sideChain.sideChainExternalAddresses in config.');
    const delay = delayFactory(config);

    const { MarketGetter: marketGetter } = config.sideChain.addresses;
    const { name, sideChainExternalAddresses } = config.deploy.sideChain;
    const uploadBlockNumber = await getBlockNumber(provider);

    const addresses = await deployContracts(config, signer, contracts);
    await registerSideChainContracts(signer, addresses, sideChainExternalAddresses, delay, overrides);

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

async function setupEthereumDeployer(config: SDKConfiguration, account: Account, overrides: ethers.PayableOverrides) {
    const { http } = config.ethereum || {};
    if (!http) throw Error('Must specify ethereum.http');
    return setupDeployer(http, config, account, overrides);
}

async function setupSideChainDeployer(config: SDKConfiguration, account: Account, overrides: ethers.PayableOverrides) {
    const { http } = config.sideChain || {};
    if (!http) throw Error('Must specify sideChain.http');
    return setupDeployer(http, config, account, overrides);
}

async function setupDeployer(http: string, config: SDKConfiguration, account: Account, overrides: ethers.PayableOverrides) {
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
    if (overrides?.gasPrice) provider.overrideGasPrice = ethers.BigNumber.from(overrides.gasPrice);
    if (overrides?.gasLimit) provider.gasLimit = ethers.BigNumber.from(overrides.gasLimit);

    const signer = await makeSigner(account, provider);
    const dependencies = await makeDependencies(account, provider, signer);

    return { signer, dependencies, provider };
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

    const addresses: Addresses = {};
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

interface Addresses { [contractName: string]: string }

async function registerSideChainContracts(
    signerOrProvider: SignerOrProvider,
    addresses: Addresses,
    sideChainExternalAddresses: SideChainExternalAddresses,
    delay: Delay,
    overrides?: ethers.Overrides,
) {
    const sideChainAugur = new SideChainAugur(addresses['SideChainAugur'], signerOrProvider);
    const sideChainAugurTrading = new SideChainAugurTrading(addresses['SideChainAugurTrading'], signerOrProvider);

    await delay();
    await sideChainAugur.registerContract('Cash', sideChainExternalAddresses.Cash, overrides);
    await delay();
    await sideChainAugur.registerContract('ShareToken', addresses['SideChainShareToken'], overrides);
    await delay();
    await sideChainAugur.registerContract('Affiliates', addresses['Affiliates'], overrides);
    await delay();
    await sideChainAugur.registerContract('MarketGetter', sideChainExternalAddresses.MarketGetter, overrides);
    await delay();
    await sideChainAugur.registerContract('RepFeeTarget', sideChainExternalAddresses.RepFeeTarget, overrides);

    await delay();
    await sideChainAugurTrading.registerContract('FillOrder', addresses['SideChainFillOrder'], overrides);
    await delay();
    await sideChainAugurTrading.registerContract('ZeroXTrade', addresses['SideChainZeroXTrade'], overrides);
    await delay();
    await sideChainAugurTrading.registerContract('ProfitLoss', addresses['SideChainProfitLoss'], overrides);
    await delay();
    await sideChainAugurTrading.registerContract('ZeroXExchange', sideChainExternalAddresses.ZeroXExchange, overrides);

    const sideChainShareToken = new SideChainShareToken(addresses['SideChainShareToken'], signerOrProvider);
    const sideChainFillOrder = new SideChainFillOrder(addresses['SideChainFillOrder'], signerOrProvider);
    const sideChainZeroXTrade = new SideChainZeroXTrade(addresses['SideChainZeroXTrade'], signerOrProvider);
    const sideChainProfitLoss = new SideChainProfitLoss(addresses['SideChainProfitLoss'], signerOrProvider);
    const sideChainSimulateTrade = new SideChainSimulateTrade(addresses['SideChainSimulateTrade'], signerOrProvider);

    await delay();
    await sideChainShareToken.initialize(sideChainAugur.address, overrides);
    await delay();
    await sideChainFillOrder.initialize(sideChainAugur.address, sideChainAugurTrading.address, overrides);
    await delay();
    await sideChainZeroXTrade.initialize(sideChainAugur.address, sideChainAugurTrading.address, overrides);
    await delay();
    await sideChainProfitLoss.initialize(sideChainAugur.address, sideChainAugurTrading.address, overrides);
    await delay();
    await sideChainSimulateTrade.initialize(sideChainAugur.address, sideChainAugurTrading.address, overrides);
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
    await delayFactory(config)();
    const contractObj = await factory.deploy(...constructorArgs, overrides);
    await contractObj.deployed();
    console.log(`Uploaded contract: ${contract.contractName}: "${contractObj.address}"`);
    return contractObj.address;
}

async function getBlockNumber(provider: BlockGetter): Promise<number> {
    return provider.getBlock('latest').then(block => block.number);
}

type Delay = () => Promise<void>;
function delayFactory(config: SDKConfiguration):  Delay {
    const delayMS = config.deploy?.sideChain?.delayMS || 0;
    return async () => {
        console.log('Time before delay: ', new Date().toTimeString());
        await sleep(delayMS);
        console.log('Time after delay: ', new Date().toTimeString());
    }
}

export type SignerOrProvider = ethers.Signer | ethers.providers.Provider;

interface Contract {
    abi: ethers.ContractInterface
    contract: ethers.Contract
}

interface Registerable {
    registerContract(name: string, address: string, overrides?: ethers.Overrides): Promise<void>
}
async function registerContract(contract: ethers.Contract, name: string, address: string, overrides: ethers.Overrides) {
    await contract.registerContract(stringTo32ByteHex(name), address, overrides || {});
}

interface Initializeable1 {
    initialize(address1: string, overrides?: ethers.Overrides): Promise<void>
}
async function initialize1(contract: ethers.Contract, address1: string, overrides: ethers.Overrides) {
    await contract.initialize(address1, overrides || {});
}

interface Initializeable2 {
    initialize(address1: string, address2: string, overrides?: ethers.Overrides): Promise<void>
}
async function initialize2(contract: ethers.Contract, address1: string, address2: string, overrides: ethers.Overrides) {
    await contract.initialize(address1, address2, overrides || {});
}

class SideChainAugur implements Contract, Registerable {
    readonly abi: ethers.ContractInterface = ABI['SideChainAugur'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async registerContract(name: string, address: string, overrides?: ethers.Overrides) {
        await registerContract(this.contract, name, address, overrides);
    }
}

class SideChainAugurTrading implements Contract,  Registerable {
    readonly abi: ethers.ContractInterface = ABI['SideChainAugurTrading'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async registerContract(name: string, address: string, overrides?: ethers.Overrides) {
        await registerContract(this.contract, name, address, overrides);
    }
}

class SideChainShareToken implements Contract, Initializeable1 {
    readonly abi: ethers.ContractInterface = ABI['SideChainShareToken'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async initialize(address1: string, overrides?: ethers.Overrides) {
        await initialize1(this.contract, address1, overrides)
    }
}

class SideChainFillOrder implements Contract, Initializeable2 {
    readonly abi: ethers.ContractInterface = ABI['SideChainFillOrder'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async initialize(address1: string, address2: string, overrides?: ethers.Overrides) {
        await initialize2(this.contract, address1, address2, overrides)
    }
}

class SideChainZeroXTrade implements Contract, Initializeable2 {
    readonly abi: ethers.ContractInterface = ABI['SideChainZeroXTrade'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async initialize(address1: string, address2: string, overrides?: ethers.Overrides) {
        await initialize2(this.contract, address1, address2, overrides)
    }
}

class SideChainProfitLoss implements Contract, Initializeable2 {
    readonly abi: ethers.ContractInterface = ABI['SideChainProfitLoss'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async initialize(address1: string, address2: string, overrides?: ethers.Overrides) {
        await initialize2(this.contract, address1, address2, overrides)
    }
}

class SideChainSimulateTrade implements Contract, Initializeable2 {
    readonly abi: ethers.ContractInterface = ABI['SideChainSimulateTrade'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async initialize(address1: string, address2: string, overrides?: ethers.Overrides) {
        await initialize2(this.contract, address1, address2, overrides)
    }
}

export async function registerArbitrumChain(config: SDKConfiguration, account: Account) {
    const { signer } = await setupEthereumDeployer(config, account, {});
    const marketGetterAddress = config.sideChain.addresses.MarketGetter;
    const { arbChain, globalInbox } = config.sideChain.specific as SpecificArbitrum;
    const bridgeAddress = config.sideChain.addresses.Bridge;
    const bridge = new ArbitrumBridge(bridgeAddress, signer);
    await bridge.registerArbchain(arbChain, globalInbox, marketGetterAddress);
}

export async function bridgeMarketToArbitrum(config: SDKConfiguration, account: Account, marketAddress: string) {
    const { signer } = await setupEthereumDeployer(config, account, {});
    const bridgeAddress = config.sideChain.addresses.Bridge;
    const arbChainAddress = (config.sideChain.specific as SpecificArbitrum).arbChain;
    const bridge = new ArbitrumBridge(bridgeAddress, signer);
    const { gasPrice, gasLimit } = ARBITRUM_OVERRIDES;
    const r = await bridge.pushBridgeData(marketAddress, arbChainAddress, new BigNumber(gasPrice), new BigNumber(gasLimit));
    console.log(r)
}

class ArbitrumBridge implements Contract {
    readonly abi: ethers.ContractInterface = ABI['ArbitrumBridge'];
    readonly contract: ethers.Contract;

    constructor(
        readonly address: string,
        readonly signerOrProvider: SignerOrProvider
    ) {
        this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
    }

    async registerArbchain(arbChainAddress: string, inboxAddress: string, marketGetterAddress: string, overrides?: ethers.Overrides) {
        await this.contract.registerArbchain(arbChainAddress, inboxAddress, marketGetterAddress, overrides || {});
    }

    async pushBridgeData(marketAddress: string, arbChainAddress: string, arbGasPrice: BigNumber, arbGasLimit: BigNumber, overrides?: ethers.Overrides) {
        return this.contract.pushBridgeData(
            marketAddress,
            arbChainAddress,
            ethers.BigNumber.from(arbGasPrice.toFixed()),
            ethers.BigNumber.from(arbGasLimit.toFixed()),
            overrides || {},
        )
    }
}
