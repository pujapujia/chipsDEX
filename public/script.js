console.log('SCRIPT LOADING:', new Date().toISOString());

const statusElement = document.getElementById('status');
const swapBox = document.getElementById('swapBox');
const tokenIn = document.getElementById('tokenIn');
const amountIn = document.getElementById('amountIn');
const tokenOut = document.getElementById('tokenOut');
const amountOut = document.getElementById('amountOut');
const priceInfo = document.getElementById('priceInfo');
const swapButton = document.getElementById('swapButton');
const mintButton = document.getElementById('mintButton');
const burnButton = document.getElementById('burnButton');

const CHIPS_TESTNET = {
  chainId: '714',
  chainName: 'CHIPS Testnet',
  rpcUrls: ['http://20.63.3.101:8545'],
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 }
};

// Alamat kontrak (dengan checksum tervalidasi)
const FEE_RECEIVER = ethers.utils.getAddress("0x00d1cba86120485486debef7fae54132612b41b0");
const USDT_ADDRESS = ethers.utils.getAddress("0x5a5cb08ffea579ac235e3ee34b00854e4cefcbba");
const DEX_ADDRESS = ethers.utils.getAddress("0x3fb0be3029adc6cb52b0cc94825049fc2b9c0dd2");

console.log('Menggunakan alamat:', { FEE_RECEIVER, USDT_ADDRESS, DEX_ADDRESS });

const DEX_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "usdtAmountOut", type: "uint256" }],
    name: "swapChipsToUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "usdtAmountIn", type: "uint256" }],
    name: "swapUsdtToChips",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "chipsIn", type: "uint256" }],
    name: "getUsdtOut",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "usdtIn", type: "uint256" }],
    name: "getChipsOut",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "FEE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "mintUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burnUsdt",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

const USDT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectBtn');

  if (!connectBtn || !statusElement || !swapBox) {
    statusElement.innerText = 'Error: Elemen DOM tidak ditemukan!';
    statusElement.classList.add('error');
    return;
  }

  if (typeof ethers === 'undefined') {
    statusElement.innerText = 'Error: Ethers.js tidak dimuat!';
    statusElement.classList.add('error');
    return;
  }

  connectBtn.addEventListener('click', connectWallet);
  swapButton.addEventListener('click', initiateSwap);
  mintButton.addEventListener('click', initiateMint);
  burnButton.addEventListener('click', initiateBurn);
  amountIn.addEventListener('input', updatePriceEstimate);

  swapBox.style.display = 'block';

  // Polling koneksi
  setInterval(checkWalletConnection, 2000); // 2 detik
});

let provider, jsonRpcProvider, signer, account;

// Inisialisasi JsonRpcProvider
jsonRpcProvider = new ethers.providers.JsonRpcProvider('http://20.63.3.101:8545', {
  chainId: 714,
});

async function checkWalletConnection() {
  if (!provider || !window.ethereum) return;
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 714) {
      console.warn('Jaringan salah, beralih...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '714' }],
      });
    }
    const accounts = await provider.send('eth_accounts', []);
    if (accounts.length === 0) {
      console.warn('Dompet terputus!');
      statusElement.innerText = 'Dompet terputus! Silakan sambungkan kembali.';
      statusElement.classList.add('error');
      swapButton.disabled = true;
      mintButton.disabled = true;
      burnButton.disabled = true;
    }
  } catch (error) {
    console.error('Pengecekan koneksi dompet gagal:', error);
  }
}

async function connectWallet() {
  try {
    if (!window.ethereum) {
      throw new Error('Pasang MetaMask atau Rabby Wallet!');
    }

    // Retry koneksi
    let attempts = 7;
    while (attempts > 0) {
      try {
        provider = new ethers.providers.Web3Provider(window.ethereum, {
          chainId: 714,
          timeout: 90000, // 90 detik
        });

        const network = await provider.getNetwork();
        console.log('Terhubung ke jaringan:', network);
        if (network.chainId !== 714) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2ca' }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [CHIPS_TESTNET],
              });
            } else {
              throw switchError;
            }
          }
        }

        const accounts = await provider.send('eth_requestAccounts', []);
        account = accounts[0];
        signer = provider.getSigner();
        statusElement.innerText = `Terhubung: ${account.slice(0, 6)}...${account.slice(-4)}`;
        statusElement.classList.add('success');
        swapButton.disabled = false;
        mintButton.disabled = false;
        burnButton.disabled = false;
        break;
      } catch (e) {
        attempts--;
        console.warn(`Percobaan koneksi gagal (${attempts} tersisa):`, e.message);
        if (attempts === 0) throw new Error(`Gagal terhubung: ${e.message}`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  } catch (error) {
    statusElement.innerText = `Error: ${error.message}`;
    statusElement.classList.add('error');
    console.error('Error koneksi dompet:', error);
  }
}

async function updatePriceEstimate() {
  if (!amountIn.value || !jsonRpcProvider) return;
  try {
    console.log('Menginisialisasi kontrak DEX untuk estimasi harga dengan alamat:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, jsonRpcProvider);
    const amount = ethers.utils.parseUnits(amountIn.value || '0', 18);
    let estimatedOut;
    if (tokenIn.value === 'CHIPS') {
      estimatedOut = await contract.getUsdtOut(amount);
    } else {
      estimatedOut = await contract.getChipsOut(amount);
    }
    amountOut.value = ethers.utils.formatUnits(estimatedOut, 18);
    priceInfo.innerText = `Harga: 1 ${tokenIn.value} = 1 ${tokenOut.value} (+0.1 CHIPS biaya)`;
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Error tidak diketahui';
    statusElement.innerText = `Error menghitung harga: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Error estimasi harga:', error);
    // Fallback kalau checksum error
    if (error.message.includes('bad address checksum')) {
      console.warn('Error checksum terdeteksi, menggunakan alamat mentah...');
      amountOut.value = amountIn.value; // Asumsi 1:1 untuk UI
      priceInfo.innerText = `Harga: 1 ${tokenIn.value} = 1 ${tokenOut.value} (+0.1 CHIPS biaya)`;
    }
  }
}

async function initiateSwap() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Sambungkan dompet dan masukkan jumlah!';
    statusElement.classList.add('error');
    return;
  }
  try {
    console.log('Menginisialisasi kontrak DEX untuk swap dengan alamat:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    let nonce = await provider.getTransactionCount(account, 'pending');

    let tx;
    if (tokenIn.value === 'CHIPS') {
      tx = await contract.swapChipsToUsdt(amount, {
        value: amount.add(fee),
        gasPrice: ethers.BigNumber.from("10000000000"),
        nonce,
      });
    } else {
      console.log('Menginisialisasi kontrak USDT untuk swap dengan alamat:', USDT_ADDRESS);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
      if (allowance.lt(amount)) {
        const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
          gasPrice: ethers.BigNumber.from("10000000000"),
          nonce,
        });
        await approveTx.wait();
        nonce++;
      }
      tx = await contract.swapUsdtToChips(amount, {
        value: fee,
        gasPrice: ethers.BigNumber.from("10000000000"),
        nonce,
      });
    }

    statusElement.innerText = `Sedang melakukan swap... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Swap selesai! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Error tidak diketahui';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Error swap:', error);
  }
}

async function initiateMint() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Sambungkan dompet dan masukkan jumlah!';
    statusElement.classList.add('error');
    return;
  }
  try {
    console.log('Menginisialisasi kontrak DEX untuk mint dengan alamat:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    const nonce = await provider.getTransactionCount(account, 'pending');

    const dexBalance = await jsonRpcProvider.getBalance(DEX_ADDRESS);
    if (dexBalance.lt(amount)) {
      throw new Error("CHIPS tidak cukup di DEX untuk minting");
    }

    const tx = await contract.mintUsdt(amount, {
      value: amount.add(fee),
      gasPrice: ethers.BigNumber.from("10000000000"),
      nonce,
    });

    statusElement.innerText = `Sedang minting... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Minting selesai! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Error tidak diketahui';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Error mint:', error);
  }
}

async function initiateBurn() {
  if (!provider || !signer || !amountIn.value) {
    statusElement.innerText = 'Error: Sambungkan dompet dan masukkan jumlah!';
    statusElement.classList.add('error');
    return;
  }
  try {
    console.log('Menginisialisasi kontrak DEX untuk burn dengan alamat:', DEX_ADDRESS);
    const contract = new ethers.Contract(DEX_ADDRESS, DEX_ABI, signer);
    console.log('Menginisialisasi kontrak USDT untuk burn dengan alamat:', USDT_ADDRESS);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
    const amount = ethers.utils.parseUnits(amountIn.value, 18);
    const fee = ethers.utils.parseEther("0.1");
    let nonce = await provider.getTransactionCount(account, 'pending');

    const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
    if (allowance.lt(amount)) {
      const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
        gasPrice: ethers.BigNumber.from("10000000000"),
        nonce,
      });
      await approveTx.wait();
      nonce++;
    }

    const tx = await contract.burnUsdt(amount, {
      value: fee,
      gasPrice: ethers.BigNumber.from("10000000000"),
      nonce,
    });

    statusElement.innerText = `Sedang burning... (Tx: ${tx.hash})`;
    await tx.wait();
    statusElement.innerText = `Burn selesai! (Tx: ${tx.hash})`;
    statusElement.classList.add('success');
  } catch (error) {
    const errorMsg = error.reason || error.message || 'Error tidak diketahui';
    statusElement.innerText = `Error: ${errorMsg}`;
    statusElement.classList.add('error');
    console.error('Error burn:', error);
  }
}
