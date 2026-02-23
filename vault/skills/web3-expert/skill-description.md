# Web3 Expert — Deep Reference

## Identity

You are a world-class Solana web3 engineer specializing in `@solana/web3.js` 1.x and `@solana/wallet-adapter-react`. You know the exact API surface for wallet connection, transaction construction, and on-chain identity. You understand the ZkAgentic two-tier model (Hollow DB vs On-chain) and write correct, safe wallet code for both cases.

---

## Library Versions (ZkAgentic)

```
@solana/web3.js:                 1.98.4  (legacy 1.x — NOT the new 2.x kit)
@solana/wallet-adapter-react:    ^0.15.x
@solana/wallet-adapter-wallets:  includes PhantomWalletAdapter, SolflareWalletAdapter
@solana/wallet-adapter-base:     error types, WalletAdapterNetwork enum
@solana/wallet-adapter-react-ui: optional — WalletMultiButton modal UI
```

**Critical distinction:** The project uses `@solana/web3.js` 1.x (class-based API: `Connection`, `Transaction`, `PublicKey`, `Keypair`). The new 2.x "Solana Kit" uses a completely different functional API (`createSolanaRpc`, `address()`, etc.). Do not mix them. ZkAgentic is on 1.98.4.

---

## Core Knowledge

### 1. Provider Setup — `ConnectionProvider` + `WalletProvider`

Both providers must wrap the app. `ConnectionProvider` manages the RPC `Connection`; `WalletProvider` manages the wallet adapter lifecycle.

**ZkAgentic actual implementation** (`src/components/Providers.tsx`):

```typescript
"use client";

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

export default function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets  = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

**Key rules:**
- `wallets` and `endpoint` MUST be memoized with `useMemo` — re-creating them on every render causes adapter teardown/reconnect loops.
- `autoConnect={true}` re-connects the previously selected wallet on page load (reads localStorage key `"walletAdapter"`).
- Wallets implementing the Wallet Standard are detected automatically — you only need to explicitly list legacy adapters.
- `ConnectionProvider` must be the outer provider; `WalletProvider` must be inside it.

**Full setup with error handling and multiple adapters:**

```typescript
import React, { FC, ReactNode, useMemo, useCallback } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import type { WalletError, Adapter } from '@solana/wallet-adapter-base';

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const network  = WalletAdapterNetwork.Devnet; // or Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      // Backpack uses Wallet Standard — auto-detected, no adapter needed
      // Ledger: import LedgerWalletAdapter from '@solana/wallet-adapter-ledger'
    ],
    [network]
  );

  const onError = useCallback((error: WalletError, adapter?: Adapter) => {
    console.error('Wallet error:', error.name, error.message);
    // Show toast/notification to user
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={onError}
        localStorageKey="walletAdapter"
      >
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
```

---

### 2. `useWallet()` — Complete API

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

const {
  publicKey,           // PublicKey | null — null when not connected
  connected,           // boolean — true after successful connection
  connecting,          // boolean — true during the connect handshake
  disconnecting,       // boolean — true during disconnect
  wallet,              // WalletAdapter | null — the active adapter object
  wallets,             // Adapter[] — all detected wallets
  select,              // (walletName: WalletName) => void — choose a wallet
  connect,             // () => Promise<void> — initiate connection
  disconnect,          // () => Promise<void> — disconnect current wallet
  sendTransaction,     // (tx, connection, opts?) => Promise<TransactionSignature>
  signTransaction,     // ((tx) => Promise<Transaction>) | undefined — may not be supported
  signAllTransactions, // ((txs) => Promise<Transaction[]>) | undefined
  signMessage,         // ((msg: Uint8Array) => Promise<Uint8Array>) | undefined
  signIn,              // Sign In With Solana — undefined on most wallets
} = useWallet();
```

**Critical:** `signTransaction`, `signAllTransactions`, `signMessage`, and `signIn` can be `undefined` — always check before calling:

```typescript
if (!signTransaction) throw new Error('Wallet does not support signTransaction');
```

**ZkAgentic pattern — wallet identity in ResourceBar** (`src/components/ResourceBar.tsx`):

```typescript
const { publicKey } = useWallet();

// Display abbreviated address
{publicKey ? (
  <>
    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
    <span className="text-[10px] font-mono text-purple-400/80">
      {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
    </span>
  </>
) : (
  <>
    <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
    <span className="text-[10px] font-mono text-text-muted/40">No wallet</span>
  </>
)}
```

**Connect/disconnect UI pattern:**

```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, FC } from 'react';

const WalletButton: FC = () => {
  const { publicKey, connected, connecting, disconnecting, connect, disconnect } = useWallet();

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }, [connect]);

  if (connected && publicKey) {
    return (
      <button onClick={disconnect} disabled={disconnecting}>
        {disconnecting ? 'Disconnecting...' : publicKey.toBase58().slice(0, 8) + '...'}
      </button>
    );
  }

  return (
    <button onClick={handleConnect} disabled={connecting}>
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
```

---

### 3. `useConnection()` — Access the RPC Connection

```typescript
import { useConnection } from '@solana/wallet-adapter-react';

const { connection } = useConnection();
// connection is a @solana/web3.js Connection instance
```

**Balance fetch with live subscription:**

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { FC, useEffect, useState } from 'react';

const BalanceDisplay: FC = () => {
  const { connection } = useConnection();
  const { publicKey }  = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }

    connection.getBalance(publicKey).then((lamports) => {
      setBalance(lamports / LAMPORTS_PER_SOL);
    });

    // Subscribe to live balance changes
    const subId = connection.onAccountChange(
      publicKey,
      (accountInfo) => setBalance(accountInfo.lamports / LAMPORTS_PER_SOL),
      'confirmed'
    );

    return () => { connection.removeAccountChangeListener(subId); };
  }, [connection, publicKey]);

  if (!publicKey) return <p>Connect wallet to see balance</p>;
  if (balance === null) return <p>Loading...</p>;
  return <p>{balance.toFixed(4)} SOL</p>;
};
```

---

### 4. `@solana/web3.js` 1.x Core Classes

#### `Connection`

```typescript
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Create manually (outside React, e.g. in a service module)
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// With versioned transaction support
const connection = new Connection(clusterApiUrl('devnet'), {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0,
});

// Key methods:

// Balance (returns lamports)
const lamports = await connection.getBalance(publicKey);
const sol = lamports / LAMPORTS_PER_SOL;

// Blockhash — required for every transaction
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

// Blockhash with context slot (use with sendTransaction from useWallet)
const {
  context: { slot: minContextSlot },
  value:   { blockhash, lastValidBlockHeight },
} = await connection.getLatestBlockhashAndContext();

// Send pre-signed raw transaction bytes
const signature = await connection.sendRawTransaction(rawTransaction, {
  skipPreflight: false, // set true for faster retry loops
});

// Confirm transaction
await connection.confirmTransaction(
  { blockhash, lastValidBlockHeight, signature },
  'confirmed'
);

// Current block height (for manual expiry tracking)
const blockHeight = await connection.getBlockHeight('confirmed');
```

**`clusterApiUrl` networks:**

```typescript
clusterApiUrl('devnet')       // https://api.devnet.solana.com  — ZkAgentic default
clusterApiUrl('testnet')      // https://api.testnet.solana.com
clusterApiUrl('mainnet-beta') // https://api.mainnet-beta.solana.com — production
```

Use a custom RPC URL string (e.g. from Helius or QuickNode) in production to avoid public rate limits.

#### `PublicKey`

```typescript
import { PublicKey } from '@solana/web3.js';

// From base58 string (wallet address)
const pubkey = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');

// From bytes
const pubkey2 = new PublicKey(uint8ArrayBytes);

// Conversions
pubkey.toBase58()   // '9WzDX...' — standard wallet address string
pubkey.toString()   // same as toBase58()
pubkey.toBytes()    // Uint8Array (32 bytes)
pubkey.toBuffer()   // Buffer (32 bytes)

// Comparison — NEVER use === on PublicKey objects (they are class instances)
pubkey.equals(otherPubkey)              // boolean — correct
pubkey.toBase58() === someString        // compare to string — correct
pubkey === anotherPublicKey             // WRONG — always false
```

**PublicKey as player identity in ZkAgentic:**

The `publicKey` from `useWallet()` is the player's Solana wallet address. It serves as their on-chain identity for:
- Owning agent nodes (Solana NFTs or token-gated accounts)
- Signing in-game action transactions
- Verifying ownership of grid coordinates
- Associating blockchain state with the DB user record (stored as `wallet_hash`)

```typescript
const { publicKey } = useWallet();

// Pass to API / blockchain service
const playerAddress = publicKey?.toBase58() ?? null;

// Store in DB as wallet_hash (64-char hex of the public key bytes)
const walletHash = publicKey
  ? Buffer.from(publicKey.toBytes()).toString('hex')
  : null;
```

#### `Transaction` + `TransactionInstruction`

```typescript
import {
  Transaction,
  TransactionInstruction,
  SystemProgram,
  PublicKey,
} from '@solana/web3.js';

// Build a legacy transaction
const transaction = new Transaction();

// Optional: set fields in constructor
const transaction = new Transaction({
  feePayer: publicKey,
  recentBlockhash: blockhash,
  lastValidBlockHeight,
});

// Or set after construction
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;

// Add instructions (chainable)
transaction.add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: new PublicKey('targetAddress...'),
    lamports: 1_000_000, // 0.001 SOL
  })
);

// Custom program instruction
const customInstruction = new TransactionInstruction({
  keys: [
    { pubkey: payer.publicKey, isSigner: true,  isWritable: true  },
    { pubkey: target,          isSigner: false, isWritable: false },
  ],
  data: Buffer.from('your-encoded-data', 'utf-8'),
  programId: new PublicKey('YourProgramId...'),
});

// Memo instruction example
const memoInstruction = new TransactionInstruction({
  keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
  data: Buffer.from('Hello from ZkAgentic', 'utf-8'),
  programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
});
transaction.add(memoInstruction);
```

#### `Keypair`

```typescript
import { Keypair } from '@solana/web3.js';

// Generate a new random keypair (for testing, server-side accounts, PDAs, etc.)
const keypair = Keypair.generate();
keypair.publicKey   // PublicKey
keypair.secretKey   // Uint8Array (64 bytes = private key bytes + public key bytes)

// Restore from secret key bytes
const restored = Keypair.fromSecretKey(uint8ArraySecretKey);

// Verify by round-tripping
const derived = Keypair.fromSecretKey(keypair.secretKey).publicKey;
keypair.publicKey.equals(derived); // true — verification

// NEVER use Keypair in browser components for user identity.
// Keypair is for server-side fee payer accounts and program-derived addresses.
// User identity comes from useWallet().publicKey (the connected hardware/software wallet).
```

#### `SystemProgram`

```typescript
import { SystemProgram } from '@solana/web3.js';

// SOL transfer instruction
SystemProgram.transfer({
  fromPubkey: publicKey,         // PublicKey — sender (must sign)
  toPubkey:   recipientPubkey,   // PublicKey — recipient
  lamports:   1_000_000,         // 0.001 SOL in lamports
});

// Create a new on-chain account
SystemProgram.createAccount({
  fromPubkey:       payer.publicKey,
  newAccountPubkey: newAccount.publicKey,
  lamports:         rentExemptLamports,
  space:            accountSize,
  programId:        programPublicKey,
});
```

---

### 5. Sending Transactions via `sendTransaction`

`sendTransaction` from `useWallet()` is the canonical way to send in a React component — it handles wallet signing automatically and does not require you to set `recentBlockhash` or `feePayer` manually.

```typescript
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js';
import { FC, useCallback } from 'react';

const SendSOLButton: FC = () => {
  const { connection }                 = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const handleSend = useCallback(async () => {
    // ALWAYS check publicKey before any wallet operation
    if (!publicKey) throw new WalletNotConnectedError();

    // Build the transaction — sendTransaction will set recentBlockhash + feePayer
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey:   Keypair.generate().publicKey,
        lamports:   1_000_000,
      })
    );

    // Fetch blockhash AND context slot — pass minContextSlot to sendTransaction
    const {
      context: { slot: minContextSlot },
      value:   { blockhash, lastValidBlockHeight },
    } = await connection.getLatestBlockhashAndContext();

    // sendTransaction internally signs via wallet popup then submits
    const signature: TransactionSignature = await sendTransaction(
      transaction,
      connection,
      { minContextSlot }
    );

    // Wait for confirmation
    await connection.confirmTransaction(
      { blockhash, lastValidBlockHeight, signature },
      'confirmed'
    );

    console.log('Confirmed:', signature);
  }, [publicKey, sendTransaction, connection]);

  return (
    <button onClick={handleSend} disabled={!publicKey}>
      Send 0.001 SOL
    </button>
  );
};
```

**Note:** When using `sendTransaction` from `useWallet()`, do NOT set `transaction.recentBlockhash` or `transaction.feePayer` manually — the adapter sets them. When using `connection.sendRawTransaction()` directly (server side or retry loops), you must set both manually.

---

### 6. Compatible Wallets

| Wallet | Adapter Package | Detection Method |
|--------|-----------------|------------------|
| Phantom | `@solana/wallet-adapter-wallets` (`PhantomWalletAdapter`) | Also Wallet Standard (auto-detected) |
| Solflare | `@solana/wallet-adapter-wallets` (`SolflareWalletAdapter`) | Also Wallet Standard |
| Backpack | No explicit adapter | Wallet Standard — auto-detected |
| Ledger | `@solana/wallet-adapter-ledger` (`LedgerWalletAdapter`) | Legacy adapter only |

**ZkAgentic context:** The project uses `PhantomWalletAdapter` as the primary wallet. Phantom is the dominant wallet in Solana gaming. Target Phantom for ZkAgentic player onboarding documentation and UI copy.

---

### 7. ZkAgentic Two-Tier Player State

The ZkAgentic architecture has two user modes:

| Mode | Condition | Capabilities |
|------|-----------|-------------|
| **Hollow DB** | Google auth only, no Phantom connected | `publicKey === null`. All game state is simulated locally. No real chain actions. |
| **On-chain** | Phantom connected | `publicKey !== null`. Real chain transactions possible. NFT node ownership verifiable. |

**Pattern for gating on-chain features:**

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

function ChainActionButton() {
  const { publicKey } = useWallet();

  // Gate on publicKey (the identity), not just connected (the state flag)
  if (!publicKey) {
    return (
      <p className="text-text-muted text-sm">
        Connect Phantom wallet to perform on-chain actions
      </p>
    );
  }

  return (
    <button onClick={handleChainAction}>
      Secure Block
    </button>
  );
}
```

**Syncing wallet state to Zustand** (for non-React contexts like the PixiJS game loop):

```typescript
// store/walletStore.ts
import { create } from 'zustand';

interface WalletState {
  publicKeyBase58: string | null;
  setWallet: (publicKey: string | null) => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
  publicKeyBase58: null,
  setWallet: (pk) => set({ publicKeyBase58: pk }),
}));

// Sync component — place inside the WalletProvider tree
'use client';
function WalletSync() {
  const { publicKey } = useWallet();
  useEffect(() => {
    useWalletStore.getState().setWallet(publicKey?.toBase58() ?? null);
  }, [publicKey]);
  return null;
}
```

---

### 8. Testing Patterns with Vitest

Any component or hook that calls `useWallet()` outside a real `<WalletProvider>` will throw. Always mock the entire module at file level.

**Standard mock — disconnected state** (ZkAgentic actual pattern from `button-mechanics.test.tsx`):

```typescript
// At file level — Vitest hoists vi.mock() calls
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({ publicKey: null }),
}));
```

**Extended mock — disconnected, all methods:**

```typescript
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: vi.fn(() => ({
    publicKey:    null,
    connected:    false,
    connecting:   false,
    disconnecting: false,
    connect:      vi.fn(),
    disconnect:   vi.fn(),
    sendTransaction: vi.fn(),
    signTransaction: undefined,
  })),
  useConnection: vi.fn(() => ({
    connection: {
      getBalance: vi.fn().mockResolvedValue(5_000_000_000), // 5 SOL in lamports
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash:            'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
        lastValidBlockHeight: 200,
      }),
      getLatestBlockhashAndContext: vi.fn().mockResolvedValue({
        context: { slot: 100 },
        value:   {
          blockhash:            'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
          lastValidBlockHeight: 200,
        },
      }),
      confirmTransaction:          vi.fn().mockResolvedValue({ value: { err: null } }),
      onAccountChange:             vi.fn().mockReturnValue(1), // returns subscription ID
      removeAccountChangeListener: vi.fn(),
    },
  })),
}));
```

**Simulate a connected wallet (per-test override):**

```typescript
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';

// In a specific test:
vi.mocked(useWallet).mockReturnValue({
  publicKey:       new PublicKey('11111111111111111111111111111111'),
  connected:       true,
  sendTransaction: vi.fn().mockResolvedValue('fakeSignature123'),
  // ...other fields
} as ReturnType<typeof useWallet>);
```

**Mock the `Connection` class for service-layer tests:**

```typescript
import { vi } from 'vitest';

const mockConnection = {
  getBalance:                    vi.fn().mockResolvedValue(1_000_000_000),
  getLatestBlockhash:            vi.fn().mockResolvedValue({
    blockhash:            'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    lastValidBlockHeight: 200,
  }),
  sendRawTransaction:            vi.fn().mockResolvedValue('mockSignature'),
  confirmTransaction:            vi.fn().mockResolvedValue({ value: { err: null } }),
};

vi.mock('@solana/web3.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/web3.js')>();
  return {
    ...actual, // keep PublicKey, SystemProgram, etc. real
    Connection: vi.fn(() => mockConnection),
  };
});
```

---

### 9. Blockhash Lifecycle and Expiry

This is the most common source of dropped and expired transactions.

**Key facts:**
- A blockhash is valid for approximately 60–90 seconds (~150 blocks at ~400ms/slot).
- After `lastValidBlockHeight` is exceeded, the transaction is permanently expired — you must fetch a new blockhash and rebuild.
- Always fetch blockhash at `'confirmed'` commitment. Mismatching commitment levels between `getLatestBlockhash` and `sendTransaction`/`simulateTransaction` causes "blockhash not found" errors.

**Correct pattern — fresh blockhash per transaction:**

```typescript
// Fetch right before building — never cache the blockhash
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

const transaction = new Transaction({
  feePayer: publicKey,
  recentBlockhash: blockhash,
  lastValidBlockHeight,
}).add(/* instructions */);
```

**Retry loop for raw send** (when not using `sendTransaction` from wallet adapter):

```typescript
const rawTx = transaction.serialize();
let blockHeight = await connection.getBlockHeight('confirmed');

while (blockHeight < lastValidBlockHeight) {
  await connection.sendRawTransaction(rawTx, { skipPreflight: true });
  await new Promise(r => setTimeout(r, 500));
  blockHeight = await connection.getBlockHeight('confirmed');
}
```

**Devnet vs mainnet blockhash behavior:** Both use the same ~60–90 second window. Devnet blocks may be slightly faster or slower depending on validator load.

---

### 10. Error Handling

All wallet errors extend from `@solana/wallet-adapter-base`:

```typescript
import {
  WalletNotConnectedError,
  WalletConnectionError,
  WalletSendTransactionError,
  WalletSignTransactionError,
  WalletNotReadyError,
} from '@solana/wallet-adapter-base';

async function handleChainAction() {
  try {
    if (!publicKey) throw new WalletNotConnectedError();
    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
  } catch (error) {
    if (error instanceof WalletNotConnectedError) {
      // Show "please connect wallet" UI
    } else if (error instanceof WalletNotReadyError) {
      // Phantom not installed — show install link to https://phantom.app
    } else if (error instanceof WalletSendTransactionError) {
      // Transaction rejected or failed on-chain — error.message has details
    } else if (error instanceof WalletSignTransactionError) {
      // User closed the wallet popup / rejected the signature
    } else if (error instanceof WalletConnectionError) {
      // Connect handshake failed — often a race condition, retry is safe
    } else {
      throw error; // re-throw unexpected errors
    }
  }
}
```

**Global error handler via `WalletProvider` `onError` prop** — catches adapter-level errors without try/catch in every component:

```typescript
const onError = useCallback((error: WalletError, adapter?: Adapter) => {
  console.error(`[${adapter?.name ?? 'wallet'}] ${error.name}: ${error.message}`);
  toast.error(error.message); // show to user
}, []);

<WalletProvider wallets={wallets} onError={onError}>
```

---

### 11. NFT / Token-Gated Node Ownership (ZkAgentic Context)

Agent nodes in ZkAgentic are planned as Solana NFTs or token-gated accounts. The Metaplex SDK is the standard tool for fetching NFT ownership and metadata.

```typescript
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';

// Server-side: verify player owns an agent node NFT
const metaplex = Metaplex.make(connection).use(keypairIdentity(serverKeypair));
const nfts = await metaplex.nfts().findAllByOwner({ owner: playerPublicKey });

// Check ownership of a specific node
const ownsNode = nfts.some(
  (nft) => nft.address.toBase58() === agentNodeMintAddress
);

// Read NFT attributes for game stats
for (const nft of nfts) {
  const meta = await metaplex.nfts().load({ metadata: nft });
  meta.json?.attributes?.forEach((attr) => {
    if (attr.trait_type === 'Tier') {
      const tier = attr.value; // 'haiku' | 'sonnet' | 'opus'
    }
    if (attr.trait_type === 'Strength') {
      physicalDamage += parseInt(attr.value, 10);
    }
  });
}
```

**Dynamic on-chain metadata** — use Solana Token Extensions (Token-2022) to store mutable game state (player level, XP, secured chains count) directly in the NFT mint account. This avoids off-chain metadata servers and lets the NFT evolve as players progress.

---

## Quick Reference

### useWallet() Properties

| Property | Type | Meaning |
|----------|------|---------|
| `publicKey` | `PublicKey \| null` | Wallet address — `null` when not connected |
| `connected` | `boolean` | `true` after successful connection |
| `connecting` | `boolean` | `true` during connect handshake |
| `disconnecting` | `boolean` | `true` during disconnect |
| `wallet` | `WalletAdapter \| null` | Active adapter object |
| `sendTransaction` | `function` | Send and wallet-sign a transaction |
| `signTransaction` | `function \| undefined` | Sign without sending (check for undefined first) |
| `signAllTransactions` | `function \| undefined` | Batch sign (check for undefined first) |
| `signMessage` | `function \| undefined` | Sign arbitrary bytes |

### Connection Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `getBalance(pubkey)` | `Promise<number>` | Balance in lamports |
| `getLatestBlockhash()` | `Promise<{ blockhash, lastValidBlockHeight }>` | Current blockhash |
| `getLatestBlockhashAndContext()` | `Promise<{ context, value }>` | Blockhash + slot context (use with sendTransaction) |
| `sendRawTransaction(rawTx, opts)` | `Promise<string>` | Send serialized + pre-signed tx |
| `confirmTransaction({ blockhash, lastValidBlockHeight, signature })` | `Promise<...>` | Poll until confirmed |
| `getBlockHeight()` | `Promise<number>` | Current block height |
| `onAccountChange(pubkey, cb)` | `number` (subId) | Subscribe to account changes |
| `removeAccountChangeListener(subId)` | `Promise<void>` | Unsubscribe |

### PublicKey Methods

| Method | Returns | Purpose |
|--------|---------|---------|
| `toBase58()` | `string` | Wallet address string (standard format) |
| `toBytes()` | `Uint8Array` | 32-byte raw public key |
| `toBuffer()` | `Buffer` | 32-byte buffer |
| `equals(other)` | `boolean` | Deep equality — use this, never `===` |

### Network Endpoints

| Network | `clusterApiUrl` value | ZkAgentic Use |
|---------|-----------------------|---------------|
| `'devnet'` | `https://api.devnet.solana.com` | Default — all development |
| `'testnet'` | `https://api.testnet.solana.com` | Rarely used |
| `'mainnet-beta'` | `https://api.mainnet-beta.solana.com` | Production only |

---

## Common Mistakes and Fixes

| Mistake | Fix |
|---------|-----|
| Using `connected` as the only guard | Gate on `publicKey !== null` — it is the actual identity. `connected` can be transiently true during reconnection but `publicKey` is the reliable signal. |
| Not mocking `@solana/wallet-adapter-react` in Vitest tests | Any component calling `useWallet()` outside `<WalletProvider>` throws. Add `vi.mock('@solana/wallet-adapter-react', () => ({ useWallet: () => ({ publicKey: null }) }))` at file level. |
| Comparing PublicKey objects with `===` | `===` compares object identity — always false for different instances. Use `a.equals(b)` or compare `.toBase58()` strings. |
| Caching a blockhash across multiple transactions | Blockhashes expire in ~90 seconds. Always call `getLatestBlockhash()` immediately before building each transaction. |
| Not setting `feePayer` before `sendRawTransaction` | Required for raw send. When using `sendTransaction` from `useWallet()`, the adapter sets it automatically. |
| Creating wallet adapters without `useMemo` | `new PhantomWalletAdapter()` inside render re-creates the adapter every render cycle — causes disconnect loops. Always wrap in `useMemo`. |
| Calling `sendTransaction` without checking `publicKey` | Throws `WalletNotConnectedError`. Always guard with `if (!publicKey) throw new WalletNotConnectedError()`. |
| Calling optional wallet methods without checking for `undefined` | `signTransaction`, `signAllTransactions`, `signMessage` can all be `undefined`. Always check before calling. |
| Mismatching commitment levels | Fetch blockhash at `'confirmed'`, use `'confirmed'` in `confirmTransaction`. Mixing `'processed'` and `'confirmed'` causes "blockhash not found". |
| Importing from `@solana/web3.js` 2.x | The project is on 1.98.4. The 2.x kit is a completely different API (`createSolanaRpc`, `address()`, `pipe()`, etc.). Never mix. |

---

## Key Library Versions

```
@solana/web3.js:                 1.98.4
@solana/wallet-adapter-react:    ^0.15.x
@solana/wallet-adapter-wallets:  includes PhantomWalletAdapter, SolflareWalletAdapter
@solana/wallet-adapter-base:     WalletAdapterNetwork enum, error classes
Vitest:                          4.x
```
