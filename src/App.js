import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import { FaWallet } from 'react-icons/fa';
import './App.css';

// Initialize Web3 instance with Arbitrum RPC
const web3 = new Web3(Web3.givenProvider || "https://arbitrum-mainnet.infura.io/v3/f515a55331b94cd693d03a4f0a8a39ad");

const targetAmount = 5000000000; // Target amount in DUFF (5 billion)
const DUFF_PRICE = 0.00034; // Price of DUFF in USD

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [ethPrice, setEthPrice] = useState(null);
  const [progress, setProgress] = useState(0);
  const [totalRaised, setTotalRaised] = useState(0); // Total raised in USD
  const [tokensSold, setTokensSold] = useState(0); // Tokens sold

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
    const duffAmount = parseFloat((ethInUsd / DUFF_PRICE).toFixed(2));
    return duffAmount;
  };

  const handleBuyClick = async () => {
    // Verificamos si hay una cuenta conectada
    if (!walletAddress) {
      alert('Por favor conecta tu billetera');
      return;
    }

    // Validamos la entrada del monto de ETH
    if (!ethAmount || isNaN(parseFloat(ethAmount))) {
      alert('Por favor ingresa un número válido');
      return;
    }

    const ethAmountParsed = parseFloat(ethAmount);

    // Validamos el rango del monto de ETH
    if (ethAmountParsed < 0.004 || ethAmountParsed > 0.54) {
      alert('Por favor ingresa una cantidad de ETH entre 0.004 y 0.54');
      return;
    }

    try {
      // Convertimos el valor de ETH a Wei
      const weiAmount = web3.utils.toWei(ethAmountParsed.toString(), 'ether');

      // Configuración de la transacción
      const tx = {
        from: walletAddress, // La cuenta conectada
        to: '0xf9bce13e2e56cc5b11dbb4e2a34d93e0f97aa2aa', // Dirección destino donde enviarás el ETH
        value: weiAmount, // Monto en Wei (correctamente convertido)
        gas: '300000', // Gas límite
        gasPrice: web3.utils.toWei('0.001', 'gwei'), // Precio del gas en Gwei
      };

      // Enviamos la transacción
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [tx],
      });

      // Esperamos la confirmación de la transacción
      let txReceipt = null;
      while (txReceipt === null) {
        txReceipt = await web3.eth.getTransactionReceipt(txHash);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Espera 1 segundo antes de intentar nuevamente
      }

      // Verificamos el estado de la transacción
      if (txReceipt.status) {
        const duffAmount = calculateDuff(); // Calculamos la cantidad de DUFF tokens
        setTotalRaised((prev) => prev + ethAmountParsed * ethPrice); // Actualizamos el total recaudado en USD
        setTokensSold((prev) => prev + duffAmount); // Actualizamos los tokens vendidos
        setProgress((prev) => Math.min(100, (prev + (duffAmount / targetAmount) * 100).toFixed(2))); // Actualizamos el progreso
        alert(`¡Has comprado exitosamente ${duffAmount} tokens DUFF!`);
      } else {
        alert('La transacción ha fallado.');
      }
    } catch (error) {
      console.error("Error en la solicitud de transacción:", error);
      alert("Error en la transacción. Por favor intenta nuevamente.");
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
          <span className="goal">{tokensSold.toLocaleString()} / 5,000,000,000 DUFF</span>
        </div>

        <div className="total-raised">
  <p>Total Raised: <strong>${totalRaised.toFixed(2)}</strong></p>
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
