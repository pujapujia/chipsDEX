// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
    address public dex;

    event DexUpdated(address indexed oldDex, address indexed newDex);

    constructor(address _dex) ERC20("Tether USD", "USDT") {
        require(_dex != address(0), "Invalid DEX address");
        dex = _dex;
    }

    function setDex(address _newDex) external {
        require(msg.sender == dex, "Only DEX can set new DEX");
        require(_newDex != address(0), "Invalid DEX address");
        address oldDex = dex;
        dex = _newDex;
        emit DexUpdated(oldDex, _newDex);
    }

    function mint(address to, uint256 amount) external payable {
        require(msg.sender == dex, "Only DEX can mint");
        require(msg.value >= amount, "Insufficient CHIPS sent");
        _mint(to, amount);
        if (msg.value > amount) {
            payable(msg.sender).transfer(msg.value - amount);
        }
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == dex, "Only DEX can burn");
        _burn(from, amount);
        payable(from).transfer(amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
