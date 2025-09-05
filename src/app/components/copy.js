'use client';

import { useState } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

export default function AddressDisplay({ contractAddress, className = "" }) {
  const [copied, setCopied] = useState(false);

  const truncatedAddress = `${contractAddress.slice(0, 3)}...${contractAddress.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className={`flex items-center gap-1 px-1 py-1 rounded-md ${className}`}>
      <span className="text-xs text-white font-medium">
        {truncatedAddress}
      </span>
      <button
        onClick={handleCopy}
        className="text-sm cursor-pointer text-white"
        title={copied ? "Copied!" : "Copy address"}
      >
        {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
      </button>
    </div>
  );
}