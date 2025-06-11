// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./USDT.sol";

contract DEX {
    USDT public usdt;
    address public feeRecipient;
    uint256 public constant PRICE = 1 ether; // 1 CHIPS = 1 USDT
    uint256 public constant FEE = 0.1 ether; // 0.1 CHIPS fee

    event Swap(address indexed user, bool isChipsToUsdt, uint256 amountIn, uint256 amountOut, uint256 fee);
    event Funded(address indexed funder, uint256 amount);

    constructor(address _usdt, address _feeRecipient) {
        require(_usdt != address(0), "Invalid USDT address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        usdt = USDT(_usdt);
        feeRecipient = _feeRecipient;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    function fund() external payable {
        require(msg.value > 0, "No CHIPS sent");
        emit Funded(msg.sender, msg.value);
    }

    function getUsdtOut(uint256 chipsIn) public pure returns (uint256) {
        return chipsIn;
    }

    function getChipsOut(uint256 usdtIn) public pure returns (uint256) {
        return usdtIn;
    }

    function swapChipsToUsdt(uint256 usdtAmountOut) external payable {
        require(usdtAmountOut > 0, "Invalid amount");
        require(msg.value >= usdtAmountOut + FEE, "Insufficient CHIPS");
        require(address(this).balance >= usdtAmountOut, "Insufficient CHIPS in DEX");

        payable(feeRecipient).transfer(FEE);
        usdt.mint{value: usdtAmountOut}(msg.sender, usdtAmountOut);

        emit Swap(msg.sender, true, usdtAmountOut, usdtAmountOut, FEE);
    }

    function swapUsdtToChips(uint256 usdtAmountIn) external payable {
        require(usdtAmountIn > 0, "Invalid amount");
        require(msg.value >= FEE, "Insufficient fee");
        require(address(this).balance >= usdtAmountIn, "Insufficient CHIPS in DEX");

        payable(feeRecipient).transfer(FEE);
        usdt.burn(msg.sender, usdtAmountIn);

        emit Swap(msg.sender, false, usdtAmountIn, usdtAmountIn, FEE);
    }

    function mintUsdt(uint256 amount) external payable {
        require(amount > 0, "Invalid amount");
        require(msg.value >= amount + FEE, "Insufficient CHIPS");

        payable(feeRecipient).transfer(FEE);
        usdt.mint{value: amount}(msg.sender, amount);
    }

    function burnUsdt(uint256 amount) external payable {
        require(amount > 0, "Invalid amount");
        require(msg.value >= FEE, "Insufficient fee");

        payable(feeRecipient).transfer(FEE);
        usdt.burn(msg.sender, amount);
    }
}
