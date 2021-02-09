pragma solidity 0.5.15;
pragma experimental ABIEncoderV2;

import 'ROOT/sidechain/interfaces/IAugurPushBridge.sol';
import 'ROOT/reporting/IMarket.sol';
import 'ROOT/reporting/IUniverse.sol';
import 'ROOT/sidechain/arbitrum/IGlobalInbox.sol';

contract ArbitrumBridge {

    IAugurPushBridge private augurPushBridge;
    IAugur private augur;
    address public owner;

    struct ArbChainData {
        address inboxAddress;
        address marketGetterAddress;
    }

    mapping(address => ArbChainData) private arbChainsRegistry;

    constructor(address _pushBridgeAddress, IAugur _augur) public {
        augurPushBridge = IAugurPushBridge(_pushBridgeAddress);
        augur = _augur;
        owner = msg.sender;
    }

    function registerArbchain(address _arbChainAddress, address _inboxAddress, address _marketGetterAddress) external isOwner returns (bool) {
        arbChainsRegistry[_arbChainAddress] = ArbChainData({
            inboxAddress: _inboxAddress,
            marketGetterAddress: _marketGetterAddress
        });
        return true;
    }

    function pushBridgeData (address _marketAddress, address _arbChainAddress, uint256 _arbGasPrice, uint256 _arbGasLimit) external returns (bool) {
        ArbChainData memory arbChainData = arbChainsRegistry[_arbChainAddress];
        require(arbChainData.inboxAddress != address(0), "Arbchain not registered");

        IMarket _market = IMarket(_marketAddress);
        require(augur.isKnownMarket(_market), "Market doesn't exist");

        IAugurPushBridge.MarketData memory _marketData = augurPushBridge.bridgeMarket(_market);
        bytes memory _blob = abi.encode(_marketData);
        bytes memory _marketDataPayload = abi.encodeWithSignature("receiveMarketData(bytes,address)", _blob, _marketAddress);
        bytes memory _l2MessagePayload = abi.encodePacked(uint8(1), _arbGasLimit, _arbGasPrice, uint256(uint160(bytes20(arbChainData.marketGetterAddress))), uint256(0), _marketDataPayload);
        IGlobalInbox(arbChainData.inboxAddress).sendL2Message(_arbChainAddress, _l2MessagePayload);
        return true;
    }

    function pushFeeData (address _universeAddress, address _arbChainAddress, uint256 _arbGasPrice, uint256 _arbGasLimit) external returns (bool) {
        ArbChainData memory _arbChainData = arbChainsRegistry[_arbChainAddress];
        require(_arbChainData.inboxAddress != address(0), "Arbchain not registered");

        IUniverse _universe = IUniverse(_universeAddress);
        uint256 _fee = augurPushBridge.bridgeReportingFee(_universe);
        bytes memory _feeData = abi.encodeWithSignature("receiveFeeData(bytes)", _fee);
        bytes memory _l2MessagePayload = abi.encode(_arbGasLimit, _arbGasPrice, _arbChainData.marketGetterAddress, 0, _feeData);
        IGlobalInbox(_arbChainData.inboxAddress).sendL2Message(_arbChainAddress, _l2MessagePayload);
        return true;
    }

    function transferOwnership(address _newOwner) public isOwner {
        require(_newOwner != address(0));
        owner = _newOwner;
    }

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }
}
