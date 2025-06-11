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
  chainId: '0x2ca', // Hex untuk chainId 714
  chainName: 'CHIPS Testnet',
  rpcUrls: ['https://20.63.3.101:8545'], // Ganti ke HTTPS jika node mendukung
  nativeCurrency: { name: 'CHIPS', symbol: 'CHIPS', decimals: 18 },
};

// Alamat kontrak (pastikan sudah benar dan menggunakan checksum)
const FEE_RECEIVER = "0x00D1Cba86120485486DEBEf7fAe54132612B41b0";
const USDT_ADDRESS = "0x5A5cB08ffEa579Ac235E3Ee34B00854e4cEFcBbA";
const DEX_ADDRESS = "0x3fB0Be3029Adc6CB52b0Cc94825049Fc2B9C0dD2";

console.log('Menggunakan alamat:', { FEE_RECEIVER, USDT_ADDRESS, DEX_ADDRESS });

const DEX_ABI = [
  // ABI sama seperti sebelumnya
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
  // ABI sama seperti sebelumnya
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

  // Polling koneksi dompet
  setInterval(checkWalletConnection, 2000);
});

let provider, jsonRpcProvider, signer, account;

// Inisialisasi JsonRpcProvider dengan fallback
const initJsonRpcProvider = async () => {
  try {
    jsonRpcProvider = new ethers.providers.JsonRpcProvider(
      'https://20.63.3.101:8545', // Ganti ke HTTPS jika node mendukung
      { chainId: 714 }
    );
    await jsonRpcProvider.ready; // Tunggu hingga provider siap
    console.log('JsonRpcProvider berhasil diinisialisasi');
  } catch (error) {
    console.error('Gagal menginisialisasi JsonRpcProvider:', error);
    statusElement.innerText = 'Error: Tidak dapat terhubung ke node RPC!';
    statusElement.classList.add('error');
  }
};

async function checkWalletConnection() {
  if (!provider || !window.ethereum) return;
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== 714) {
      console.warn('Jaringan salah, mencoba beralih...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2ca' }],
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
      throw new Error('Install MetaMask atau Rabby Wallet!');
    }

    provider = new ethers.providers.Web3Provider(window.ethereum, {
      chainId: 714,
      timeout: 90000,
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

    await initJsonRpcProvider(); // Inisialisasi JsonRpcProvider

    const accounts = await provider.send('eth_requestAccounts', []);
    account = accounts[0];
    signer = provider.getSigner();
    statusElement.innerText = `Terhubung: ${account.slice(0, 6)}...${account.slice(-4)}`;
    statusElement.classList.add('success');
    swapButton.disabled = false;
    mintButton.disabled = false;
    burnButton.disabled = false;
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
    // Fallback jika terjadi error
    amountOut.value = amountIn.value; // Asumsi 1:1 untuk UI
    priceInfo.innerText = `Harga: 1 ${tokenIn.value} = 1 ${tokenOut.value} (+0.1 CHIPS biaya)`;
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
        gasPrice: ethers.utils.parseUnits("10", "gwei"),
        nonce,
      });
    } else {
      console.log('Menginisialisasi kontrak USDT untuk swap dengan alamat:', USDT_ADDRESS);
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);
      const allowance = await usdtContract.allowance(account, DEX_ADDRESS);
      if (allowance.lt(amount)) {
        const approveTx = await usdtContract.approve(DEX_ADDRESS, amount, {
          gasPrice: ethers.utils.parseUnits("10", "gwei"),
          nonce,
        });
        await approveTx.wait();
        nonce++;
      }
      tx = await contract.swapUsdtToChips(amount, {
        value: fee,
        gasPrice: ethers.utils.parseUnits("10", "gwei"),
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
      throw new Error("CHIPS tidak cukup di kontrak DEX untuk minting");
    }

    const tx = await contract.mintUsdt(amount, {
      value: amount.add(fee),
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
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
        gasPrice: ethers.utils.parseUnits("10", "gwei"),
        nonce,
      });
      await approveTx.wait();
      nonce++;
    }

    const tx = await contract.burnUsdt(amount, {
      value: fee,
      gasPrice: ethers.utils.parseUnits("10", "gwei"),
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
