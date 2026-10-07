// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
/// @notice Faucet token with no monetary value. Must only deploy on test networks.
contract TestUSDC {
    string public constant name="CardLane Test USD";string public constant symbol="testUSDC";uint8 public constant decimals=6;
    mapping(address=>uint256) public balanceOf;mapping(address=>mapping(address=>uint256)) public allowance;
    event Transfer(address indexed from,address indexed to,uint256 amount);event Approval(address indexed owner,address indexed spender,uint256 amount);
    function faucet() external {balanceOf[msg.sender]+=1000e6;emit Transfer(address(0),msg.sender,1000e6);}
    function approve(address spender,uint256 amount) external returns(bool){allowance[msg.sender][spender]=amount;emit Approval(msg.sender,spender,amount);return true;}
    function transfer(address to,uint256 amount) external returns(bool){_move(msg.sender,to,amount);return true;}
    function transferFrom(address from,address to,uint256 amount) external returns(bool){uint256 a=allowance[from][msg.sender];require(a>=amount,"allowance");allowance[from][msg.sender]=a-amount;_move(from,to,amount);return true;}
    function _move(address from,address to,uint256 amount) private {require(to!=address(0)&&balanceOf[from]>=amount,"balance");balanceOf[from]-=amount;balanceOf[to]+=amount;emit Transfer(from,to,amount);}
}
