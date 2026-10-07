// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
interface IERC20 { function transferFrom(address,address,uint256) external returns(bool); function transfer(address,uint256) external returns(bool); }
/// @notice Testnet gift-card escrow. Codes and plaintext keys never enter this contract.
contract CardLane {
    enum State { Missing, Listed, Paid, Disputed, Settled, Refunded, Cancelled }
    struct Listing { address seller; address buyer; uint256 price; uint64 paidAt; State state; string cid; bytes32 payloadHash; }
    IERC20 public immutable token;
    address public immutable arbiter;
    uint256 public constant CLAIM_WINDOW = 2 days;
    mapping(bytes32 => Listing) private listings;
    mapping(address => bool) public allowedSeller;
    bytes32[] public listingIds;
    uint256 private entered = 1;
    event Listed(bytes32 indexed id,address indexed seller,string cid,uint256 price);
    event Purchased(bytes32 indexed id,address indexed buyer);
    event StateChanged(bytes32 indexed id,State state);
    error Invalid(); error Unauthorized(); error WrongState(); error TransferFailed();
    modifier nonReentrant(){if(entered!=1) revert Invalid();entered=2;_;entered=1;}
    constructor(address paymentToken,address disputeArbiter){if(paymentToken.code.length==0 || disputeArbiter==address(0)) revert Invalid();token=IERC20(paymentToken);arbiter=disputeArbiter;allowedSeller[disputeArbiter]=true;}
    function setSeller(address seller,bool allowed) external {if(msg.sender!=arbiter) revert Unauthorized();if(seller==address(0)) revert Invalid();allowedSeller[seller]=allowed;}
    function createListing(bytes32 id,string calldata cid,bytes32 payloadHash,uint256 price) external {
        if(!allowedSeller[msg.sender]) revert Unauthorized();
        if(id==bytes32(0)||listings[id].state!=State.Missing||price==0||payloadHash==bytes32(0)||bytes(cid).length<10||bytes(cid).length>100) revert Invalid();
        listings[id]=Listing(msg.sender,address(0),price,0,State.Listed,cid,payloadHash);listingIds.push(id);emit Listed(id,msg.sender,cid,price);
    }
    function count() external view returns(uint256){return listingIds.length;}
    function getListing(bytes32 id) external view returns(Listing memory){return listings[id];}
    function buy(bytes32 id,uint256 expectedPrice,bytes32 expectedHash) external nonReentrant {
        Listing storage l=listings[id];if(l.state!=State.Listed) revert WrongState();if(msg.sender==l.seller) revert Unauthorized();
        if(l.price!=expectedPrice||l.payloadHash!=expectedHash) revert Invalid();
        l.buyer=msg.sender;l.paidAt=uint64(block.timestamp);l.state=State.Paid;
        if(!token.transferFrom(msg.sender,address(this),l.price)) revert TransferFailed();emit Purchased(id,msg.sender);
    }
    function canDecrypt(bytes32 id,address user) external view returns(bool){Listing storage l=listings[id];return user!=address(0)&&user==l.buyer&&(l.state==State.Paid||l.state==State.Disputed||l.state==State.Settled);}
    function cancel(bytes32 id) external {Listing storage l=listings[id];if(msg.sender!=l.seller) revert Unauthorized();if(l.state!=State.Listed) revert WrongState();l.state=State.Cancelled;emit StateChanged(id,l.state);}
    function confirm(bytes32 id) external nonReentrant {Listing storage l=listings[id];if(msg.sender!=l.buyer) revert Unauthorized();if(l.state!=State.Paid) revert WrongState();_paySeller(id,l);}
    function dispute(bytes32 id) external {Listing storage l=listings[id];if(msg.sender!=l.buyer) revert Unauthorized();if(l.state!=State.Paid||block.timestamp>=l.paidAt+CLAIM_WINDOW) revert WrongState();l.state=State.Disputed;emit StateChanged(id,l.state);}
    function settleAfterWindow(bytes32 id) external nonReentrant {Listing storage l=listings[id];if(msg.sender!=l.seller) revert Unauthorized();if(l.state!=State.Paid||block.timestamp<l.paidAt+CLAIM_WINDOW) revert WrongState();_paySeller(id,l);}
    function sellerRefund(bytes32 id) external nonReentrant {Listing storage l=listings[id];if(msg.sender!=l.seller) revert Unauthorized();if(l.state!=State.Paid&&l.state!=State.Disputed) revert WrongState();_refund(id,l);}
    function resolve(bytes32 id,bool refundBuyer) external nonReentrant {if(msg.sender!=arbiter) revert Unauthorized();Listing storage l=listings[id];if(l.state!=State.Disputed) revert WrongState();if(refundBuyer)_refund(id,l);else _paySeller(id,l);}
    function _paySeller(bytes32 id,Listing storage l) private {l.state=State.Settled;if(!token.transfer(l.seller,l.price)) revert TransferFailed();emit StateChanged(id,l.state);}
    function _refund(bytes32 id,Listing storage l) private {l.state=State.Refunded;if(!token.transfer(l.buyer,l.price)) revert TransferFailed();emit StateChanged(id,l.state);}
}
