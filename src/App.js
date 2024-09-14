import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { FaWallet } from 'react-icons/fa';
import './App.css';

// Initialize Web3 instance with Arbitrum RPC
const web3 = new Web3(Web3.givenProvider || "https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad");

const targetAmount = 500000; // Target amount in DUFF
const DUFF_PRICE = 0.00034; // Price of DUFF in USD

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [ethPrice, setEthPrice] = useState(null);
  const [progress, setProgress] = useState(0);

  // Fetch ETH price from CoinGecko
  const fetchEthPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      setEthPrice(data.ethereum.usd);
    } catch (error) {
      console.error('Error fetching ETH price:', error);
    }
  };

  useEffect(() => {
    fetchEthPrice();
  }, []);

  const checkNetwork = useCallback(async () => {
    try {
      const currentChainId = await web3.eth.getChainId();
      if (currentChainId !== 42161) {
        await switchToArbitrum();
      }
    } catch (error) {
      console.error('Error checking network:', error);
    }
  }, []);

  useEffect(() => {
    if (walletConnected) {
      checkNetwork();
    }
  }, [walletConnected, checkNetwork]);

  const connectWallet = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletConnected(true);
      setWalletAddress(accounts[0]);
      const networkId = await web3.eth.getChainId();
      if (networkId !== 42161) {
        await switchToArbitrum();
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
  };

  const switchToArbitrum = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xA4B1' }]
      });
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xA4B1',
            chainName: 'Arbitrum One',
            nativeCurrency: {
              name: 'Arbitrum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad'],
            blockExplorerUrls: ['https://arbiscan.io']
          }]
        });
      } else {
        console.error('Error checking or switching network:', error);
      }
    }
  };

  const calculateDuff = () => {
    if (!ethPrice || !ethAmount) return 0;
    const ethInUsd = ethAmount * ethPrice;
    const duffAmount = (ethInUsd / DUFF_PRICE).toFixed(2);
    return duffAmount;
  };

  const handleBuyClick = async () => {
    try {
      if (!window.ethereum) {
        console.error('MetaMask is not installed');
        return;
      }

      // Validar que la wallet esté conectada
      if (!walletConnected || !walletAddress) {
        console.error('Wallet not connected');
        return;
      }

      const amountInEth = parseFloat(ethAmount);
      if (isNaN(amountInEth) || amountInEth <= 0) {
        console.error('Invalid ETH amount');
        return;
      }

      const recipient = '0xf9bce13e2e56cc5b11dbb4e2a34d93e0f97aa2aa'; // Dirección de recepción en ETH

      // Estimar el gas necesario
      const gasEstimate = await web3.eth.estimateGas({
        from: walletAddress,
        to: recipient,
        value: web3.utils.toWei(ethAmount, 'ether')
      });

      // Enviar la transacción
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: recipient,
          value: web3.utils.toHex(web3.utils.toWei(ethAmount.toString(), 'ether')),
          gas: web3.utils.toHex(gasEstimate),
          gasPrice: web3.utils.toHex(web3.utils.toWei('20', 'gwei')) // Ajuste de precio de gas
        }]
      });

      console.log('Transaction sent! Hash:', txHash);

      // Actualizar progreso
      const totalInDuff = calculateDuff();
      setProgress(prev => Math.min(100, (prev + (totalInDuff / targetAmount) * 100).toFixed(2)));
      
    } catch (error) {
      console.error('Transaction error:', error);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <div className="wallet-info">
          <FaWallet size={28} color="white" />
          {walletConnected ? (
            <>
              <span className="wallet-address">
                {walletAddress.slice(0, 5)}...{walletAddress.slice(-4)}
              </span>
              <button className="btn-disconnect" onClick={disconnectWallet}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn-connect" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="project-info">
          <img src="/img/duff.jpg" alt="Logo Duff" className="logo" />
          <h1 className="project-name">$DUFF</h1>
        </div>

        <div className="price-info">
          <p>Token Price per Duff: <strong>$0.00034</strong></p>
          <p>Current ETH Price: <strong>{ethPrice ? `$${ethPrice}` : 'Loading...'}</strong></p>
        </div>

        <div className="progress-bar-container">
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }}>
              <span>{progress.toFixed(2)}%</span>
            </div>
          </div>
          <span className="goal">${targetAmount}</span>
        </div>

        <div className="input-group">
          <div className="input-field">
            <input
              type="number"
              placeholder="ETH"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
            />
            <img src="/img/arbitrum.png" alt="ETH" className="token-logo" />
          </div>
          <div className="input-field">
            <input type="text" value={calculateDuff()} disabled />
            <img src="/img/duff.jpg" alt="Duff" className="token-logo" />
          </div>
        </div>

        <button className="btn-buy" onClick={handleBuyClick}>
          BUY DUFF
        </button>
      </main>
    </div>
  );
}

export default App;
