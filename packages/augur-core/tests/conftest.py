import pytest
import eth
import eth_tester
from typing import Any
from datetime import timedelta
from eth_tester import PyEVMBackend, EthereumTester
from solc import compile_standard
from io import open as io_open
from json import dump as json_dump, load as json_load, dumps as json_dumps
from os import path, walk, makedirs, remove as remove_file
from re import findall
from contract import Contract
from utils import stringToBytes, BuyWithCash, PrintGasUsed, nullAddress, relayHubSignedDeployTx

from web3 import (
    EthereumTesterProvider,
    Web3,
)

from web3.middleware import (
    abi_middleware,
    attrdict_middleware,
    gas_price_strategy_middleware,
    name_to_address_middleware,
    normalize_errors_middleware,
    pythonic_middleware,
    request_parameter_normalizer,
    validation_middleware,
)

from eth_typing import (
    Address,
    Hash32
)

from trie import (
    HexaryTrie,
)

from eth.db.hash_trie import HashTrie

from eth._utils.padding import (
    pad32,
)

from eth_utils import (
    encode_hex,
    is_checksum_address,
    int_to_big_endian,
)

from eth.rlp.headers import (
    BlockHeader,
    HeaderParams,
)

from eth_hash.auto import keccak
from eth_utils import (
    encode_hex,
)

from eth import constants
from eth.exceptions import (
    OutOfGas,
)
from eth.vm.computation import BaseComputation
from eth.vm.forks.homestead.computation import (
    HomesteadComputation,
)

from eth.vm.forks.spurious_dragon.opcodes import SPURIOUS_DRAGON_OPCODES

from hexbytes.main import HexBytes

import rlp

import web3

# Remove Size check. We rely on output warnings for this instead
eth.vm.forks.spurious_dragon.computation.EIP170_CODE_SIZE_LIMIT = 100000

genesis_overrides = {
    'gas_limit': 1100000000
}
custom_genesis_params = PyEVMBackend._generate_genesis_params(overrides=genesis_overrides)
custom_genesis_state = PyEVMBackend._generate_genesis_state(num_accounts=9)

# Hacks to reduce test time
def new_is_valid_opcode(self, position: int) -> bool:
    return True

def new_debug2(self, message: str, *args: Any, **kwargs: Any) -> None:
    pass

def dumb_gas_search(*args) -> int:
    return 790000000

def dumb_get_buffered_gas_estimate(web3, transaction, gas_buffer=100000):
    return 790000000

def dumb_estimateGas(self, transaction, block_identifier=None):
    return 790000000

def get_chainId(computation):
    return 1

def new_create_header_from_parent(self,
                                parent_header: BlockHeader,
                                **header_params: HeaderParams) -> BlockHeader:
    header = self.get_vm_class_for_block_number(
        block_number=parent_header.block_number + 1,
    ).create_header_from_parent(parent_header, **header_params)
    header._gas_limit = 1100000000
    return header

eth.vm.code_stream.CodeStream.is_valid_opcode = new_is_valid_opcode
web3._utils.transactions.get_buffered_gas_estimate = dumb_get_buffered_gas_estimate
eth.chains.base.Chain.create_header_from_parent = new_create_header_from_parent
old_estimateGas = web3.eth.Eth.estimateGas
web3.eth.Eth.estimateGas = dumb_estimateGas

# used to resolve relative paths
BASE_PATH = path.dirname(path.abspath(__file__))
def resolveRelativePath(relativeFilePath):
    return path.abspath(path.join(BASE_PATH, relativeFilePath))
COMPILATION_CACHE = resolveRelativePath('./compilation_cache')

class bcolors:
    WARN = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'

CONTRACT_SIZE_LIMIT = 24576.0
CONTRACT_SIZE_WARN_LEVEL = CONTRACT_SIZE_LIMIT * 0.75

def pytest_addoption(parser):
    parser.addoption("--cover", action="store_true", help="Use the coverage enabled contracts. Meant to be used with the tools/generateCoverageReport.js script")
    parser.addoption("--subFork", action="store_true", help="Run tests in the context of a forked universe child")
    parser.addoption("--paraAugur", action="store_true", help="Run tests in the context of the ETH sub-version of Augur")
    parser.addoption("--sideChain", action="store_true", help="Run tests in the context of a sidechain deployment of Augur")

def pytest_configure(config):
    # register an additional marker
    config.addinivalue_line("markers", "cover: use coverage contracts")

TRADING_CONTRACTS = ['CreateOrder','FillOrder','CancelOrder','Trade','Orders','ZeroXTrade','ProfitLoss','SimulateTrade','AugurWalletRegistry','AugurWalletRegistryV2','AugurWalletFactory','AccountLoader']

class ContractsFixture:
    signatures = {}
    compiledCode = {}

    ####
    #### Static Methods
    ####

    @staticmethod
    def ensureCacheDirectoryExists():
        if not path.exists(COMPILATION_CACHE):
            makedirs(COMPILATION_CACHE)

    def __init__(self, request):
        self.eth_tester = EthereumTester(backend=PyEVMBackend(genesis_parameters=custom_genesis_params, genesis_state=custom_genesis_state))
        self.testerProvider = EthereumTesterProvider(ethereum_tester=self.eth_tester)
        self.w3 = Web3(self.testerProvider)
        self.eth_tester.backend.chain.gas_estimator = dumb_gas_search
        self.privateKeys = self.eth_tester.backend.account_keys
        self.accounts = self.eth_tester.get_accounts()
        self.contracts = {}
        self.relativeContractsPath = '../src/contracts'
        self.relativeTestContractsPath = 'solidity_test_helpers'
        # self.relativeTestContractsPath = 'mock_templates/contracts'
        self.coverageMode = request.config.option.cover
        self.subFork = request.config.option.subFork
        self.paraAugur = request.config.option.paraAugur
        self.sideChain = request.config.option.sideChain
        self.logListener = None
        if self.coverageMode:
            self.logListener = self.writeLogToFile
            self.relativeContractsPath = '../coverageEnv/contracts'
            self.relativeTestContractsPath = '../coverageEnv/solidity_test_helpers'

    def writeLogToFile(self, message):
        with open('./allFiredEvents', 'a') as logsFile:
            logData = message.__dict__
            for key, value in logData.items():
                if type(value) == HexBytes:
                    logData[key] = value.hex()[2:]
            logData['topics'] = [val.hex()[2:] for val in logData['topics']]
            logData['data'] = logData['data'][2:]
            logsFile.write(json_dumps(logData) + '\n')

    def generateSignature(self, relativeFilePath):
        ContractsFixture.ensureCacheDirectoryExists()
        filename = path.basename(relativeFilePath)
        name = path.splitext(filename)[0]
        outputPath = path.join(COMPILATION_CACHE,  name + 'Signature')
        lastCompilationTime = path.getmtime(outputPath) if path.isfile(outputPath) else 0
        if path.getmtime(relativeFilePath) > lastCompilationTime:
            print('generating signature for ' + name)
            extension = path.splitext(filename)[1]
            signature = None
            if extension == '.sol':
                signature = self.compileSolidity(relativeFilePath)['abi']
            else:
                raise
            with open(outputPath, mode='w') as file:
                json_dump(signature, file)
        else:
            pass#print('using cached signature for ' + name)
        with open(outputPath, 'r') as file:
            signature = json_load(file)
        return(signature)

    def getCompiledCode(self, relativeFilePath):
        filename = path.basename(relativeFilePath)
        name = path.splitext(filename)[0]
        if name in ContractsFixture.compiledCode:
            return ContractsFixture.compiledCode[name]
        dependencySet = set()
        self.getAllDependencies(relativeFilePath, dependencySet)
        ContractsFixture.ensureCacheDirectoryExists()
        compiledOutputPath = path.join(COMPILATION_CACHE, name)
        lastCompilationTime = path.getmtime(compiledOutputPath) if path.isfile(compiledOutputPath) else 0
        needsRecompile = False
        for dependencyPath in dependencySet:
            if (path.getmtime(dependencyPath) > lastCompilationTime):
                needsRecompile = True
                break
        if (needsRecompile):
            print('compiling ' + name + '...')
            extension = path.splitext(filename)[1]
            compiledCode = None
            if extension == '.sol':
                compiledCode = bytearray.fromhex(self.compileSolidity(relativeFilePath)['evm']['bytecode']['object'])
            else:
                raise
            with io_open(compiledOutputPath, mode='wb') as file:
                file.write(compiledCode)
        else:
            pass#print('using cached compilation for ' + name)
        with io_open(compiledOutputPath, mode='rb') as file:
            compiledCode = file.read()
            contractSize = len(compiledCode)
            if (contractSize >= CONTRACT_SIZE_LIMIT):
                print('%sContract %s is OVER the size limit by %d bytes%s' % (bcolors.FAIL, name, contractSize - CONTRACT_SIZE_LIMIT, bcolors.ENDC))
            elif (contractSize >= CONTRACT_SIZE_WARN_LEVEL):
                print('%sContract %s is under size limit by only %d bytes%s' % (bcolors.WARN, name, CONTRACT_SIZE_LIMIT - contractSize, bcolors.ENDC))
            elif (contractSize > 0):
                print('Contract %s Size: %i' % (name, contractSize))
            ContractsFixture.compiledCode[name] = compiledCode
            return(compiledCode)

    def compileSolidity(self, relativeFilePath):
        absoluteFilePath = resolveRelativePath(relativeFilePath)
        filename = path.basename(relativeFilePath)
        contractName = path.splitext(filename)[0]
        compilerParameter = {
            'language': 'Solidity',
            'sources': {
                absoluteFilePath: {
                    'urls': [ absoluteFilePath ]
                }
            },
            'settings': {
                # TODO: Remove 'remappings' line below and update 'sources' line above
                'remappings': [ 'ROOT=%s/' % resolveRelativePath(self.relativeContractsPath), 'TEST=%s/' % resolveRelativePath(self.relativeTestContractsPath) ],
                'optimizer': {
                    'enabled': True,
                    'runs': 200,
                    "details": {
                        "yul": True,
                        "deduplicate": True,
                        "cse": True,
                        "constantOptimizer": True
                    }
                },
                'outputSelection': {
                    "*": {
                        '*': [ 'metadata', 'evm.bytecode', 'evm.sourceMap', 'abi' ]
                    }
                }
            }
        }
        return compile_standard(compilerParameter, allow_paths=resolveRelativePath("../"))['contracts'][absoluteFilePath][contractName]

    def getAllDependencies(self, filePath, knownDependencies):
        knownDependencies.add(filePath)
        fileDirectory = path.dirname(filePath)
        with open(filePath, 'r') as file:
            fileContents = file.read()
        matches = findall("inset\('(.*?)'\)", fileContents)
        for match in matches:
            dependencyPath = path.abspath(path.join(fileDirectory, match))
            if not dependencyPath in knownDependencies:
                self.getAllDependencies(dependencyPath, knownDependencies)
        matches = findall("create\('(.*?)'\)", fileContents)
        for match in matches:
            dependencyPath = path.abspath(path.join(fileDirectory, match))
            if not dependencyPath in knownDependencies:
                self.getAllDependencies(dependencyPath, knownDependencies)
        matches = findall("import ['\"](.*?)['\"]", fileContents)
        for match in matches:
            dependencyPath = path.join(BASE_PATH, self.relativeContractsPath, match).replace("ROOT/", "")
            if "TEST" in dependencyPath:
                dependencyPath = path.join(BASE_PATH, self.relativeTestContractsPath, match).replace("TEST/", "")
            if not path.isfile(dependencyPath):
                print("BAD DEPS for", filePath)
                print("BAD DEPS is", dependencyPath)
                raise Exception("Could not resolve dependency file path: %s dep path: %s" % (filePath, dependencyPath))
            if not dependencyPath in knownDependencies:
                self.getAllDependencies(dependencyPath, knownDependencies)
        return(knownDependencies)

    def uploadAndAddToAugur(self, relativeFilePath, lookupKey = None, signatureKey = None, constructorArgs=[]):
        lookupKey = lookupKey if lookupKey else path.splitext(path.basename(relativeFilePath))[0]
        #with PrintGasUsed(self, "UPLOAD CONTRACT %s" % lookupKey, 0):
        contract = self.upload(relativeFilePath, lookupKey, signatureKey, constructorArgs)
        if not contract: return None
        elif lookupKey in TRADING_CONTRACTS:
            self.contracts['AugurTrading'].registerContract(lookupKey.ljust(32, '\x00').encode('utf-8'), contract.address)
        else:
            self.contracts['Augur'].registerContract(lookupKey.ljust(32, '\x00').encode('utf-8'), contract.address)
        return(contract)

    def generateAndStoreSignature(self, relativePath):
        key = path.splitext(path.basename(relativePath))[0]
        resolvedPath = resolveRelativePath(relativePath)
        if self.coverageMode:
            resolvedPath = resolvedPath.replace("tests", "coverageEnv").replace("src/", "coverageEnv/", 1)
        if key not in ContractsFixture.signatures:
            ContractsFixture.signatures[key] = self.generateSignature(resolvedPath)

    def upload(self, relativeFilePath, lookupKey = None, signatureKey = None, constructorArgs=[]):
        resolvedPath = resolveRelativePath(relativeFilePath)
        if self.coverageMode:
            resolvedPath = resolvedPath.replace("tests", "coverageEnv").replace("src/", "coverageEnv/", 1)
        lookupKey = lookupKey if lookupKey else path.splitext(path.basename(resolvedPath))[0]
        signatureKey = signatureKey if signatureKey else lookupKey
        if lookupKey in self.contracts:
            return(self.contracts[lookupKey])
        compiledCode = self.getCompiledCode(resolvedPath)
        # abstract contracts have a 0-length array for bytecode
        abstractContracts = ["GSNRecipient", "Context", "Ownable"]
        if len(compiledCode) == 0:
            if ("libraries" in relativeFilePath or lookupKey.startswith("I") or lookupKey.startswith("Base") or lookupKey.startswith("DS") or lookupKey in abstractContracts):
                pass#print "Skipping upload of " + lookupKey + " because it had no bytecode (likely a abstract class/interface)."
            else:
                raise Exception("Contract: " + lookupKey + " has no bytecode, but this is not expected. It probably doesn't implement all its abstract methods")
            return None
        if signatureKey not in ContractsFixture.signatures:
            ContractsFixture.signatures[signatureKey] = self.generateSignature(resolvedPath)
        signature = ContractsFixture.signatures[signatureKey]
        W3Contract = self.w3.eth.contract(abi=signature, bytecode=compiledCode)
        deploy_address = self.accounts[0]
        tx_hash = W3Contract.constructor(*constructorArgs).transact({'from': deploy_address, 'gasPrice': 1, 'gas': 1000000000})
        tx_receipt = self.w3.eth.waitForTransactionReceipt(tx_hash, 180)
        if tx_receipt.status == 0:
            raise Exception("Contract upload %s failed" % lookupKey)
        w3Contract = W3Contract(tx_receipt.contractAddress)
        contract = Contract(self.w3, w3Contract, self.logListener, self.coverageMode)
        self.contracts[lookupKey] = contract
        return contract

    def applySignature(self, signatureName, address, signature=None):
        assert address
        if signature is None:
            signature = ContractsFixture.signatures[signatureName]
        W3Contract = self.w3.eth.contract(abi=signature)
        w3Contract = W3Contract(address)
        contract = Contract(self.w3, w3Contract, self.logListener, self.coverageMode)
        return contract

    def createSnapshot(self):
        return self.eth_tester.take_snapshot()

    def resetToSnapshot(self, snapshot):
        self.eth_tester.revert_to_snapshot(snapshot)

    def createSnapshot(self):
        contractsCopy = {}
        for contractName in self.contracts:
            contractsCopy[contractName] = dict(signature = self.contracts[contractName].abi, address = self.contracts[contractName].address)
        return  { 'snapshot_id': self.eth_tester.take_snapshot(), 'contracts': contractsCopy }

    def resetToSnapshot(self, snapshot):
        if not 'snapshot_id' in snapshot: raise "snapshot is missing 'snapshot_id'"
        if not 'contracts' in snapshot: raise "snapshot is missing 'contracts'"
        self.eth_tester.revert_to_snapshot(snapshot['snapshot_id'])
        self.contracts = {}
        for contractName in snapshot['contracts']:
            contract = snapshot['contracts'][contractName]
            self.contracts[contractName] = self.applySignature(None, contract['address'], contract['signature'])

    def getBlockNumber(self):
        return self.eth_tester.backend.chain.header.block_number

    def mineBlocks(self, numBlocks):
        for i in range(int(numBlocks)):
            self.eth_tester.backend.chain.mine_block()

    def uploadAllContracts(self):
        for directory, _, filenames in walk(resolveRelativePath(self.relativeContractsPath)):
            # skip the legacy reputation directory since it is unnecessary and we don't support uploads of contracts with constructors yet
            if 'legacy_reputation' in directory: continue
            if 'external' in directory: continue
            if '0x' in directory: continue # uploaded separately
            if 'uniswap' in directory: continue # uploaded separately
            if 'gsn/v2' in directory: continue # uploaded separately
            if 'gov' in directory: continue # uploaded separately
            if 'trading/erc20proxy' in directory: continue # uploaded separately
            if 'sidechain' in directory: continue # uploaded separately
            for filename in filenames:
                name = path.splitext(filename)[0]
                extension = path.splitext(filename)[1]
                if extension != '.sol': continue
                if name == 'augur': continue
                if name == 'Augur': continue
                if name == 'WethWrapperForAMMExchange': continue # TODO
                if name == 'Orders': continue # In testing we use the TestOrders version which lets us call protected methods
                if name == 'Time': continue # In testing and development we swap the Time library for a ControlledTime version which lets us manage block timestamp
                if name == 'ReputationTokenFactory': continue # In testing and development we use the TestNetReputationTokenFactory which lets us faucet
                if name == 'Cash': continue # We upload the Test Dai contracts manually after this process
                if name in ['ParaDeployer', 'ParaAugur', 'FeePot', 'ParaUniverse', 'ParaAugurTrading','AMMExchange', 'AMMFactory', 'ParaShareToken', 'ParaZeroXTrade', 'OINexus']: continue # We upload ParaAugur explicitly and the others are generated via contract
                if name in ['IAugur', 'IDisputeCrowdsourcer', 'IDisputeWindow', 'IUniverse', 'IMarket', 'IReportingParticipant', 'IReputationToken', 'IOrders', 'IShareToken', 'Order', 'IInitialReporter']: continue # Don't compile interfaces or libraries
                # TODO these four are necessary for test_universe but break everything else
                # if name == 'MarketFactory': continue # tests use mock
                # if name == 'ReputationTokenFactory': continue # tests use mock
                # if name == 'DisputeWindowFactory': continue # tests use mock
                # if name == 'UniverseFactory': continue # tests use mock
                if name  == 'WethWrapperForAMMExchange': continue
                onlySignatures = ["ReputationToken", "TestNetReputationToken", "Universe", "ParaOracle"]
                if name in onlySignatures:
                    self.generateAndStoreSignature(path.join(directory, filename))
                elif name == "TimeControlled":
                    self.uploadAndAddToAugur(path.join(directory, filename), lookupKey = "Time", signatureKey = "TimeControlled")
                # TODO this breaks test_universe tests but is necessary for other tests
                elif name == "TestNetReputationTokenFactory":
                    self.uploadAndAddToAugur(path.join(directory, filename), lookupKey = "ReputationTokenFactory", signatureKey = "TestNetReputationTokenFactory")
                elif name == "TestOrders":
                    self.uploadAndAddToAugur(path.join(directory, filename), lookupKey = "Orders", signatureKey = "TestOrders")
                else:
                    self.uploadAndAddToAugur(path.join(directory, filename))

    def uploadTestDaiContracts(self):
        self.uploadAndAddToAugur("../src/contracts/Cash.sol")

    def uploadERC20Proxy1155(self):
        masterProxy = self.upload("../src/contracts/trading/erc20proxy1155/ERC20Proxy1155.sol")
        shareToken = self.contracts["ParaShareToken"] if self.paraAugur else self.contracts["ShareToken"]
        self.upload("../src/contracts/trading/erc20proxy1155/ERC20Proxy1155Nexus.sol", constructorArgs=[masterProxy.address, shareToken.address])

    def uploadAMMContracts(self):
        masterProxy = self.upload('../src/contracts/para/AMMExchange.sol')
        self.upload('../src/contracts/para/AMMFactory.sol', constructorArgs=[masterProxy.address])

    def uploadWethWrappedAmm(self, factory, shareToken):
        return self.upload("../src/contracts/para/WethWrapperForAMMExchange.sol", constructorArgs=[factory.address, shareToken.address])

    def upload0xContracts(self):
        chainId = 123456
        contractSetups = [
            ("ERC20Proxy", "asset-proxy/contracts/src/ERC20Proxy", []),
            ("ERC721Proxy", "asset-proxy/contracts/src/ERC721Proxy", []),
            ("ERC1155Proxy", "asset-proxy/contracts/src/ERC1155Proxy", []),
            ("MultiAssetProxy", "asset-proxy/contracts/src/MultiAssetProxy", []),
            ("ZeroXExchange", "exchange/contracts/src/Exchange", [chainId]),
            ("ZeroXCoordinator", "coordinator/contracts/src/Coordinator", ["EXCHANGE", chainId]),
            ("CoordinatorRegistry", "coordinator/contracts/src/registry/CoordinatorRegistry", []),
            ("ChaiBridge", "asset-proxy/contracts/src/bridges/ChaiBridge", []),
            ("DevUtils", "dev-utils/contracts/src/DevUtils", ["EXCHANGE", "CHAI_BRIDGE"]),
            ("WETH9", "erc20/contracts/src/WETH9", []),
            ("ZRXToken", "erc20/contracts/src/ZRXToken", []),
        ]
        zeroXContracts = dict()
        for alias, filename, constructorArgs in contractSetups:
            if constructorArgs and constructorArgs[0] == "EXCHANGE":
                constructorArgs[0] = zeroXContracts["ZeroXExchange"]
            if constructorArgs and len(constructorArgs) == 2 and constructorArgs[1] == "CHAI_BRIDGE":
                constructorArgs[1] = zeroXContracts["ChaiBridge"]
            contract = self.upload("../src/contracts/0x/{}.sol".format(filename), constructorArgs=constructorArgs)
            zeroXContracts[alias] = contract.address
            self.contracts[alias] = contract
        self.contracts["ZeroXExchange"].registerAssetProxy(zeroXContracts["ERC1155Proxy"])
        self.contracts["ZeroXExchange"].registerAssetProxy(zeroXContracts["ERC20Proxy"])
        self.contracts["ZeroXExchange"].registerAssetProxy(zeroXContracts["MultiAssetProxy"])
        self.contracts["MultiAssetProxy"].registerAssetProxy(zeroXContracts["ERC1155Proxy"])
        self.contracts["MultiAssetProxy"].registerAssetProxy(zeroXContracts["ERC20Proxy"])
        self.contracts["ERC1155Proxy"].addAuthorizedAddress(zeroXContracts["ZeroXExchange"])
        self.contracts["ERC1155Proxy"].addAuthorizedAddress(zeroXContracts["MultiAssetProxy"])
        self.contracts["ERC20Proxy"].addAuthorizedAddress(zeroXContracts["ZeroXExchange"])
        self.contracts["ERC20Proxy"].addAuthorizedAddress(zeroXContracts["MultiAssetProxy"])
        self.contracts["MultiAssetProxy"].addAuthorizedAddress(zeroXContracts["ZeroXExchange"])
        self.contracts['AugurTrading'].registerContract("ZeroXExchange".ljust(32, '\x00').encode('utf-8'), zeroXContracts["ZeroXExchange"])
        self.contracts['AugurTrading'].registerContract("WETH9".ljust(32, '\x00').encode('utf-8'), zeroXContracts["WETH9"])
        return zeroXContracts

    def uploadUniswapContracts(self):
        factory = self.uploadAndAddToAugur("../src/contracts/uniswap/UniswapV2Factory.sol", constructorArgs=[nullAddress])
        self.generateAndStoreSignature("../src/contracts/uniswap/UniswapV2Pair.sol")
        wethAddress = self.contracts["WETH9"].address
        self.upload("../src/contracts/uniswap/UniswapV2Router02.sol", constructorArgs=[factory.address, wethAddress])

    def initializeAllContracts(self):
        coreContractsToInitialize = ['Time','ShareToken','WarpSync','RepOracle','AuditFunds']
        for contractName in coreContractsToInitialize:
            if getattr(self.contracts[contractName], "initialize", None):
                #print("Initializing %s" % contractName)
                self.contracts[contractName].initialize(self.contracts['Augur'].address)
            else:
                raise "contract has no 'initialize' method on it."
        augurAddress = self.contracts["Augur"].address
        for contractName in TRADING_CONTRACTS:
            #print("Initializing %s" % contractName)
            value = 0
            if contractName.startswith("AugurWalletRegistry"):
                value = 2.5 * 10**17
            self.contracts[contractName].initialize(augurAddress, self.contracts['AugurTrading'].address, value=value)

    ####
    #### Helpers
    ####

    def approveCentralAuthority(self):
        contractsNeedingApproval = ['Augur','FillOrder','CreateOrder','ZeroXTrade', 'ParaAugur', 'ParaZeroXTrade']
        contractsToApprove = ['Cash', 'ParaAugurCash', 'WETH9']
        testersGivingApproval = [self.accounts[x] for x in range(0,8)]
        for testerKey in testersGivingApproval:
            for contractName in contractsToApprove:
                for authorityName in contractsNeedingApproval:
                    self.contracts[contractName].approve(self.contracts[authorityName].address, 2**254, sender=testerKey)
        contractsToSetApproval = ['ShareToken', 'ParaShareToken']
        for testerKey in testersGivingApproval:
            for contractName in contractsToSetApproval:
                for authorityName in contractsNeedingApproval:
                    self.contracts[contractName].setApprovalForAll(self.contracts[authorityName].address, True, sender=testerKey)

    def uploadAugur(self):
        # We have to upload Augur first
        with PrintGasUsed(self, "AUGUR CREATION", 0):
            return self.upload("../src/contracts/Augur.sol")

    def uploadParaAugur(self):
        OINexus = self.upload("../src/contracts/para/OINexus.sol", constructorArgs=[self.contracts["WETH9"].address, self.contracts["UniswapV2Factory"].address])
        feePotFactory = self.contracts["FeePotFactory"].address
        paraUniverseFactory = self.contracts["ParaUniverseFactory"].address
        paraOICashFactory = self.contracts["ParaOICashFactory"].address
        paraOICash = self.contracts["ParaOICash"].address
        zeroXExchange = self.contracts["ZeroXExchange"].address
        WETH9 = self.contracts["WETH9"].address
        factories = [
            self.contracts["ParaAugurFactory"].address,
            self.contracts["ParaAugurTradingFactory"].address,
            self.contracts["ParaShareTokenFactory"].address,
            self.contracts["CancelOrderFactory"].address,
            self.contracts["CreateOrderFactory"].address,
            self.contracts["FillOrderFactory"].address,
            self.contracts["OrdersFactory"].address,
            self.contracts["ProfitLossFactory"].address,
            self.contracts["SimulateTradeFactory"].address,
            self.contracts["TradeFactory"].address,
            self.contracts["ZeroXTradeFactory"].address,
        ]
        paraDeployer = self.upload("../src/contracts/para/ParaDeployer.sol", constructorArgs=[self.contracts["Augur"].address, feePotFactory, paraUniverseFactory, paraOICashFactory, paraOICash, OINexus.address, zeroXExchange, WETH9, factories])
        self.contracts["ParaDeployer"] = paraDeployer
        OINexus.transferOwnership(paraDeployer.address)

        paraAugurCash = self.upload("../src/contracts/Cash.sol", "ParaAugurCash", "Cash")
        paraDeployer.addToken(paraAugurCash.address, 10**19)
        while paraDeployer.paraDeployProgress(paraAugurCash.address) < 14:
            with PrintGasUsed(self, "PARA DEPLOY CASH STAGE: %i" % paraDeployer.paraDeployProgress(paraAugurCash.address), 0):
                paraDeployer.progressDeployment(paraAugurCash.address)

        paraDeployer.addToken(WETH9, 10 ** 18)
        while paraDeployer.paraDeployProgress(WETH9) < 14:
            with PrintGasUsed(self, "PARA DEPLOY WETH STAGE: %i" % paraDeployer.paraDeployProgress(WETH9), 0):
                paraDeployer.progressDeployment(WETH9)

        self.generateAndStoreSignature("../src/contracts/para/FeePot.sol")
        self.generateAndStoreSignature("../src/contracts/para/ParaUniverse.sol")
        self.generateAndStoreSignature("../src/contracts/para/ParaAugur.sol")
        self.generateAndStoreSignature("../src/contracts/para/ParaAugurTrading.sol")
        self.generateAndStoreSignature("../src/contracts/para/ParaShareToken.sol")
        self.generateAndStoreSignature("../src/contracts/para/ParaZeroXTrade.sol")
        self.generateAndStoreSignature("../src/contracts/trading/Orders.sol")

        paraAugurAddress = paraDeployer.paraAugurs(paraAugurCash.address)
        paraAugurTradingAddress = paraDeployer.paraAugurTradings(paraAugurCash.address)
        paraAugur = self.applySignature('ParaAugur', paraAugurAddress)
        paraAugurTrading = self.applySignature('ParaAugurTrading', paraAugurTradingAddress)
        self.contracts["ParaAugur"] = paraAugur
        self.contracts["ParaAugurTrading"] = paraAugurTrading
        self.contracts["ParaRepOracle"] = self.applySignature('RepOracle', paraAugur.lookup("ParaRepOracle"))
        self.contracts["ParaShareToken"] = self.applySignature('ParaShareToken', paraAugur.lookup("ShareToken"))
        self.contracts["ParaZeroXTrade"] = self.applySignature('ParaZeroXTrade', paraAugurTrading.lookup("ZeroXTrade"))

        paraWethAugurAddress = paraDeployer.paraAugurs(WETH9)
        paraWethAugurTradingAddress = paraDeployer.paraAugurTradings(WETH9)
        paraWethAugur = self.applySignature('ParaAugur', paraWethAugurAddress)
        paraWethAugurTrading = self.applySignature('ParaAugurTrading', paraWethAugurTradingAddress)
        self.contracts["ParaWethAugur"] = paraWethAugur
        self.contracts["ParaWethAugurTrading"] = paraWethAugurTrading
        self.contracts["ParaWethRepOracle"] = self.applySignature('RepOracle', paraWethAugur.lookup("ParaRepOracle"))
        self.contracts["ParaWethShareToken"] = self.applySignature('ParaShareToken', paraWethAugur.lookup("ShareToken"))
        self.contracts["ParaWethZeroXTrade"] = self.applySignature('ParaZeroXTrade', paraWethAugurTrading.lookup("ZeroXTrade"))

        if self.paraAugur:
            self.contracts['AugurTrading'] = paraAugurTrading
            for contractName in ['CreateOrder','FillOrder','CancelOrder','Trade','Orders','ProfitLoss','SimulateTrade']:
                self.contracts[contractName] = self.applySignature(contractName, paraAugurTrading.lookup(contractName))
            accountLoader = self.upload("../src/contracts/utility/AccountLoader.sol", "ParaAccountLoader", "AccountLoader")
            accountLoader.initialize(paraAugur.address, paraAugurTrading.address)
            self.contracts["AccountLoader"] = accountLoader

    def uploadSideChainAugur(self):
        sideChainAugur = self.upload("../src/contracts/sidechain/SideChainAugur.sol")
        sideChainCash = self.upload("../src/contracts/Cash.sol", "SideChainCash", "Cash")
        sideChainShareToken = self.upload("../src/contracts/sidechain/SideChainShareToken.sol")
        marketGetter = self.upload("solidity_test_helpers/SideChainMarketGetter.sol")
        sideChainAffiliates = self.upload("../src/contracts/reporting/Affiliates.sol", "SideChainAffiliates", "Affiliates")

        sideChainAugur.registerContract("Cash".ljust(32, '\x00').encode('utf-8'), sideChainCash.address)
        sideChainAugur.registerContract("ShareToken".ljust(32, '\x00').encode('utf-8'), sideChainShareToken.address)
        sideChainAugur.registerContract("MarketGetter".ljust(32, '\x00').encode('utf-8'), marketGetter.address)
        sideChainAugur.registerContract("Affiliates".ljust(32, '\x00').encode('utf-8'), sideChainAffiliates.address)
        sideChainAugur.registerContract("RepFeeTarget".ljust(32, '\x00').encode('utf-8'), marketGetter.address)

        sideChainAugurTrading = self.upload("../src/contracts/sidechain/SideChainAugurTrading.sol", constructorArgs=[sideChainAugur.address])
        sideChainFillOrder = self.upload("../src/contracts/sidechain/SideChainFillOrder.sol")
        sideChainZeroXTrade = self.upload("../src/contracts/sidechain/SideChainZeroXTrade.sol")
        sideChainProfitLoss = self.upload("../src/contracts/sidechain/SideChainProfitLoss.sol")
        sideChainSimulateTrade = self.upload("../src/contracts/sidechain/SideChainSimulateTrade.sol")

        sideChainAugurTrading.registerContract("FillOrder".ljust(32, '\x00').encode('utf-8'), sideChainFillOrder.address)
        sideChainAugurTrading.registerContract("ZeroXTrade".ljust(32, '\x00').encode('utf-8'), sideChainZeroXTrade.address)
        sideChainAugurTrading.registerContract("ProfitLoss".ljust(32, '\x00').encode('utf-8'), sideChainProfitLoss.address)
        sideChainAugurTrading.registerContract("ZeroXExchange".ljust(32, '\x00').encode('utf-8'), self.contracts["ZeroXExchange"].address)

        # Simulate Trade in real TS deploy as well

        sideChainShareToken.initialize(sideChainAugur.address)
        sideChainFillOrder.initialize(sideChainAugur.address, sideChainAugurTrading.address)
        sideChainZeroXTrade.initialize(sideChainAugur.address, sideChainAugurTrading.address)
        sideChainProfitLoss.initialize(sideChainAugur.address, sideChainAugurTrading.address)
        sideChainSimulateTrade.initialize(sideChainAugur.address, sideChainAugurTrading.address)

        # Doing approvals here
        contractsNeedingApproval = ['SideChainAugur','SideChainFillOrder','SideChainZeroXTrade']
        contractsToApprove = ['SideChainCash']
        testersGivingApproval = [self.accounts[x] for x in range(0,8)]
        for testerKey in testersGivingApproval:
            for contractName in contractsToApprove:
                for authorityName in contractsNeedingApproval:
                    self.contracts[contractName].approve(self.contracts[authorityName].address, 2**254, sender=testerKey)
        contractsToSetApproval = ['SideChainShareToken']
        for testerKey in testersGivingApproval:
            for contractName in contractsToSetApproval:
                for authorityName in contractsNeedingApproval:
                    self.contracts[contractName].setApprovalForAll(self.contracts[authorityName].address, True, sender=testerKey)

    def uploadAugurTrading(self):
        # We have to upload Augur Trading before trading contracts
        augurAddress = self.contracts["Augur"].address
        path = "../src/contracts/trading/AugurTrading.sol"
        return self.upload(path, "AugurTrading", constructorArgs=[augurAddress])

    def deployRelayHub(self):
        self.sendEth(self.accounts[0], "0xff20d47eb84b1b85aadcccc43d2dc0124c6211f7", 42 * 10**17)
        tester = self.testerProvider.ethereum_tester
        test = tester.send_raw_transaction(relayHubSignedDeployTx)

    def deployRelayHubV2(self):
        penalizer = self.upload("../src/contracts/gsn/v2/Penalizer.sol")
        stakeManager = self.upload("../src/contracts/gsn/v2/StakeManager.sol")
        relayHubV2 = self.upload("../src/contracts/gsn/v2/RelayHubV2.sol", constructorArgs=[stakeManager.address, penalizer.address])
        self.contracts['AugurTrading'].registerContract("RelayHubV2".ljust(32, '\x00').encode('utf-8'), relayHubV2.address)

    def doAugurTradingApprovals(self):
        self.contracts["AugurTrading"].doApprovals()

    def createUniverse(self):
        augur = self.contracts['Augur']
        with PrintGasUsed(self, "GENESIS CREATION", 0):
            assert augur.createGenesisUniverse(getReturnData=False)
        universeCreatedLogs = augur.getLogs("UniverseCreated")
        universeAddress = universeCreatedLogs[0].args.childUniverse
        universe = self.applySignature('Universe', universeAddress)
        return universe

    def distributeRep(self, universe):
        # Get the reputation token for this universe and migrate legacy REP to it
        reputationToken = self.applySignature('ReputationToken', universe.getReputationToken())
        legacyRepToken = self.applySignature('LegacyReputationToken', reputationToken.getLegacyRepToken())
        totalSupply = legacyRepToken.balanceOf(self.accounts[0])
        legacyRepToken.approve(reputationToken.address, totalSupply)
        reputationToken.migrateFromLegacyReputationToken()

    def getLogValue(self, eventName, argName):
        tradeEvents = ['OrderEvent','ProfitLossChanged','MarketVolumeChanged']
        augur = self.contracts['AugurTrading'] if eventName in tradeEvents else self.contracts['Augur']
        logs = augur.getLogs(eventName)
        log = logs[0]
        return log.args.__dict__[argName]

    def createYesNoMarket(self, universe, endTime, feePerCashInAttoCash, affiliateFeeDivisor, designatedReporterAddress, sender=None, extraInfo="{description: \"description\", categories: [\"\"]}", validityBond=0, affiliateValidator=nullAddress):
        sender = sender or self.accounts[0]
        marketCreationFee = validityBond or universe.getOrCacheValidityBond(commitTx=False)
        with BuyWithCash(self.contracts['Cash'], marketCreationFee, sender, "validity bond"):
            assert universe.createYesNoMarket(int(endTime), feePerCashInAttoCash, affiliateValidator, affiliateFeeDivisor, designatedReporterAddress, extraInfo, sender=sender, getReturnData=False)
        marketAddress = self.getLogValue("MarketCreated", "market")
        market = self.applySignature('Market', marketAddress)
        return market

    def createCategoricalMarket(self, universe, numOutcomes, endTime, feePerCashInAttoCash, affiliateFeeDivisor, designatedReporterAddress, outcomes = None, sender=None, extraInfo="{description: \"description\", categories: [\"\", \"\"]}", affiliateValidator=nullAddress):
        sender = sender or self.accounts[0]
        marketCreationFee = universe.getOrCacheValidityBond(commitTx=False)
        if outcomes is None:
            outcomes = [" "] * numOutcomes
        with BuyWithCash(self.contracts['Cash'], marketCreationFee, sender, "validity bond"):
            assert universe.createCategoricalMarket(endTime, feePerCashInAttoCash, affiliateValidator, affiliateFeeDivisor, designatedReporterAddress, outcomes, extraInfo, sender=sender, getReturnData=False)
        marketAddress = self.getLogValue("MarketCreated", "market")
        market = self.applySignature('Market', marketAddress)
        return market

    def createScalarMarket(self, universe, endTime, feePerCashInAttoCash, affiliateFeeDivisor, maxPrice, minPrice, numTicks, designatedReporterAddress, sender=None, extraInfo="{description: \"description\", categories: [\"\", \"\", \"\"]}", affiliateValidator=nullAddress):
        sender = sender or self.accounts[0]
        marketCreationFee = universe.getOrCacheValidityBond(commitTx=False)
        with BuyWithCash(self.contracts['Cash'], marketCreationFee, sender, "validity bond"):
            assert universe.createScalarMarket(endTime, feePerCashInAttoCash, affiliateValidator, affiliateFeeDivisor, designatedReporterAddress, [minPrice, maxPrice], numTicks, extraInfo, sender=sender, getReturnData=False)
        marketAddress = self.getLogValue("MarketCreated", "market")
        market = self.applySignature('Market', marketAddress)
        return market

    def createReasonableYesNoMarket(self, universe, sender=None, extraInfo="{description: \"description\", categories: [\"\", \"\", \"\"]}", validityBond=0, designatedReporterAddress=None, affiliateValidator=nullAddress):
        sender = sender or self.accounts[0]
        designatedReporter = designatedReporterAddress or sender
        return self.createYesNoMarket(
            universe = universe,
            endTime = self.contracts["Time"].getTimestamp() + timedelta(days=1).total_seconds(),
            feePerCashInAttoCash = 10**16,
            affiliateValidator = affiliateValidator,
            affiliateFeeDivisor = 4,
            designatedReporterAddress = designatedReporter,
            sender = sender,
            extraInfo= extraInfo,
            validityBond= validityBond)

    def createReasonableCategoricalMarket(self, universe, numOutcomes, sender=None, affiliateValidator=nullAddress):
        sender = sender or self.accounts[0]
        return self.createCategoricalMarket(
            universe = universe,
            numOutcomes = numOutcomes,
            affiliateValidator = affiliateValidator,
            endTime = self.contracts["Time"].getTimestamp() + timedelta(days=1).total_seconds(),
            feePerCashInAttoCash = 10**16,
            affiliateFeeDivisor = 0,
            designatedReporterAddress = sender,
            sender = sender)

    def createReasonableScalarMarket(self, universe, maxPrice, minPrice, numTicks, sender=None, affiliateValidator=nullAddress):
        sender = sender or self.accounts[0]
        return self.createScalarMarket(
            universe = universe,
            endTime = self.contracts["Time"].getTimestamp() + timedelta(days=1).total_seconds(),
            feePerCashInAttoCash = 10**16,
            affiliateValidator = affiliateValidator,
            affiliateFeeDivisor = 0,
            maxPrice= maxPrice,
            minPrice= minPrice,
            numTicks= numTicks,
            designatedReporterAddress = sender,
            sender = sender)

    def getShareToken(self, market, outcome):
        address = market.getShareToken(outcome)
        return self.applySignature("ShareToken", address)

    def sendEth(self, sender, receiver, amount):
        tester = self.testerProvider.ethereum_tester
        tester.send_transaction({'from': sender, 'to': receiver, 'gas': 30000, 'gas_price': 1, 'value': amount, 'data': '0x'})

    def ethBalance(self, account):
        tester = self.testerProvider.ethereum_tester
        return tester.get_balance(account)

    def getShareToken(self):
        if self.paraAugur:
            return self.contracts["ParaShareToken"]
        if self.sideChain:
            return self.contracts["SideChainShareToken"]
        return self.contracts["ShareToken"]

    def getZeroXTrade(self):
        if self.paraAugur:
            return self.contracts["ParaZeroXTrade"]
        if self.sideChain:
            return self.contracts["SideChainZeroXTrade"]
        return self.contracts["ZeroXTrade"]

    def marketBalance(self, market):
        universe = self.applySignature("Universe", market.getUniverse())
        if self.paraAugur:
            paraAugur = self.contracts["ParaAugur"]
            universe = self.applySignature("Universe", paraAugur.getParaUniverse(universe.address))
        return universe.marketBalance(market.address)

    def getOpenInterestInAttoCash(self, universe):
        if self.paraAugur:
            paraAugur = self.contracts["ParaAugur"]
            universe = self.applySignature("Universe", paraAugur.getParaUniverse(universe.address))
        return universe.getOpenInterestInAttoCash()

    def marketCreatorFeesAttoCash(self, market):
        if not self.paraAugur:
            return market.marketCreatorFeesAttoCash()
        universe = self.applySignature("Universe", market.getUniverse())
        paraAugur = self.contracts["ParaAugur"]
        paraUniverse = self.applySignature("ParaUniverse", paraAugur.getParaUniverse(universe.address))
        return paraUniverse.marketCreatorFeesAttoCash(market.address)

    def getFeePot(self, universe):
        paraAugur = self.contracts["ParaAugur"]
        paraUniverse = self.applySignature("ParaUniverse", paraAugur.getParaUniverse(universe.address))
        return self.applySignature("FeePot", paraUniverse.getFeePot())


@pytest.fixture(scope="session")
def fixture(request):
    return ContractsFixture(request)

@pytest.fixture(scope="session")
def baseSnapshot(fixture):
    return fixture.createSnapshot()

@pytest.fixture(scope="session")
def augurInitializedSnapshot(fixture, baseSnapshot):
    fixture.resetToSnapshot(baseSnapshot)
    fixture.uploadAugur()
    fixture.uploadAugurTrading()
    fixture.deployRelayHub()
    fixture.deployRelayHubV2()
    fixture.uploadAllContracts()
    fixture.uploadTestDaiContracts()
    fixture.upload0xContracts()
    fixture.uploadUniswapContracts()
    fixture.initializeAllContracts()
    fixture.contracts["Universe"] = fixture.createUniverse()
    fixture.uploadParaAugur()
    fixture.uploadSideChainAugur()
    fixture.uploadERC20Proxy1155()
    fixture.uploadAMMContracts()
    if not fixture.paraAugur:
        fixture.doAugurTradingApprovals()
    fixture.approveCentralAuthority()
    return fixture.createSnapshot()

@pytest.fixture(scope="session")
def augurPartiallyInitializedSnapshot(fixture, baseSnapshot):
    fixture.resetToSnapshot(baseSnapshot)
    fixture.uploadAugur()
    fixture.uploadAugurTrading()
    fixture.deployRelayHub()
    fixture.deployRelayHubV2()
    fixture.uploadAllContracts()
    fixture.uploadTestDaiContracts()
    fixture.upload0xContracts()
    fixture.uploadUniswapContracts()
    fixture.initializeAllContracts()
    return fixture.createSnapshot()

@pytest.fixture(scope="session")
def kitchenSinkSnapshot(fixture, augurInitializedSnapshot):
    fixture.resetToSnapshot(augurInitializedSnapshot)
    legacyReputationToken = fixture.contracts['LegacyReputationToken']
    legacyReputationToken.faucet(11 * 10**6 * 10**18)
    universe = fixture.contracts["Universe"]
    paraAugurCash = fixture.contracts['ParaAugurCash']
    cash = fixture.contracts['Cash']
    shareToken = fixture.contracts['ShareToken']
    augur = fixture.contracts['Augur']
    paraShareToken = fixture.contracts['ParaShareToken']
    sideChainCash = fixture.contracts['SideChainCash']
    sideChainShareToken = fixture.contracts['SideChainShareToken']
    fixture.distributeRep(universe)

    if fixture.subFork:
        forkingMarket = fixture.createReasonableYesNoMarket(universe)
        proceedToFork(fixture, forkingMarket, universe)
        fixture.contracts["Time"].setTimestamp(universe.getForkEndTime() + 1)
        reputationToken = fixture.applySignature('ReputationToken', universe.getReputationToken())
        yesPayoutNumerators = [0, 0, forkingMarket.getNumTicks()]
        reputationToken.migrateOutByPayout(yesPayoutNumerators, reputationToken.balanceOf(fixture.accounts[0]))
        universe = fixture.applySignature('Universe', universe.createChildUniverse(yesPayoutNumerators))

    yesNoMarket = fixture.createReasonableYesNoMarket(universe)
    categoricalMarket = fixture.createReasonableCategoricalMarket(universe, 3)
    categorical8Market = fixture.createReasonableCategoricalMarket(universe, 7)
    scalarMarket = fixture.createReasonableScalarMarket(universe, 30 * 10**18, -10 * 10**18, 400000)
    fixture.uploadAndAddToAugur("solidity_test_helpers/Constants.sol")

    snapshot = fixture.createSnapshot()
    snapshot['universe'] = universe
    snapshot['cash'] = cash
    snapshot['paraAugurCash'] = paraAugurCash
    snapshot['paraShareToken'] = paraShareToken
    snapshot['sideChainCash'] = sideChainCash
    snapshot['sideChainShareToken'] = sideChainShareToken
    snapshot['shareToken'] = shareToken
    snapshot['augur'] = augur
    snapshot['yesNoMarket'] = yesNoMarket
    snapshot['categoricalMarket'] = categoricalMarket
    snapshot['categorical8Market'] = categorical8Market
    snapshot['scalarMarket'] = scalarMarket
    snapshot['reputationToken'] = fixture.applySignature('TestNetReputationToken', universe.getReputationToken())
    return snapshot

@pytest.fixture
def kitchenSinkFixture(fixture, kitchenSinkSnapshot):
    fixture.resetToSnapshot(kitchenSinkSnapshot)
    return fixture

@pytest.fixture
def universe(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['universe'].address, kitchenSinkSnapshot['universe'].abi)

@pytest.fixture
def cash(kitchenSinkFixture, kitchenSinkSnapshot):
    cash = kitchenSinkSnapshot['cash']
    if kitchenSinkFixture.paraAugur:
        cash = kitchenSinkSnapshot['paraAugurCash']
    if kitchenSinkFixture.sideChain:
        cash = kitchenSinkSnapshot['sideChainCash']
    return kitchenSinkFixture.applySignature(None, cash.address, cash.abi)

@pytest.fixture
def shareToken(kitchenSinkFixture, kitchenSinkSnapshot):
    shareToken = kitchenSinkSnapshot['shareToken']
    if kitchenSinkFixture.paraAugur:
        shareToken = kitchenSinkSnapshot['paraShareToken']
    if kitchenSinkFixture.sideChain:
        shareToken = kitchenSinkSnapshot['sideChainShareToken']
    return kitchenSinkFixture.applySignature(None, shareToken.address, shareToken.abi)

@pytest.fixture
def augur(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['augur'].address, kitchenSinkSnapshot['augur'].abi)

@pytest.fixture
def market(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['yesNoMarket'].address, kitchenSinkSnapshot['yesNoMarket'].abi)

@pytest.fixture
def yesNoMarket(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['yesNoMarket'].address, kitchenSinkSnapshot['yesNoMarket'].abi)

@pytest.fixture
def categoricalMarket(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['categoricalMarket'].address, kitchenSinkSnapshot['categoricalMarket'].abi)

@pytest.fixture
def scalarMarket(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['scalarMarket'].address, kitchenSinkSnapshot['scalarMarket'].abi)

@pytest.fixture
def reputationToken(kitchenSinkFixture, kitchenSinkSnapshot):
    return kitchenSinkFixture.applySignature(None, kitchenSinkSnapshot['reputationToken'].address, kitchenSinkSnapshot['reputationToken'].abi)


# TODO: globally replace this with `fixture` and `kitchenSinkSnapshot` as appropriate then delete this
@pytest.fixture(scope="session")
def sessionFixture(fixture, kitchenSinkSnapshot):
    fixture.resetToSnapshot(kitchenSinkSnapshot)
    return fixture

@pytest.fixture
def contractsFixture(fixture, kitchenSinkSnapshot):
    fixture.resetToSnapshot(kitchenSinkSnapshot)
    return fixture

@pytest.fixture
def augurInitializedFixture(fixture, augurInitializedSnapshot):
    fixture.resetToSnapshot(augurInitializedSnapshot)
    return fixture

@pytest.fixture
def augurPartiallyInitializedFixture(fixture, augurPartiallyInitializedSnapshot):
    fixture.resetToSnapshot(augurPartiallyInitializedSnapshot)
    return fixture
