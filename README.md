# Shroud: Private Trading on Sui with Full Compliance

Shroud is the first fully functional privacy-preserving DApp on the Sui blockchain, enabling confidential and compliant trading by integrating zero-knowledge proofs with public DEX infrastructure.

## 🔒 Key Features:

- Privacy with Compliance: Users can privately deposit, withdraw, and swap assets, but direct hidden-to-hidden transfers are restricted. All trades happen through a public DEX to ensure transparency and auditability.

- Auditable Export: Users can export their full private transaction history for audits and compliance reporting.

- ZK Infrastructure: Zero-knowledge circuits are built in Rust (arkworks) and Circom, with Groth16 verification and Poseidon hash precompile integration.

- Pure Move Primitives: Implements a sparse Merkle tree with historical tracking in pure Move. A Poseidon hash in pure Move was also developed (not used in current version).

- Frontend ↔ Circuit: Full-featured frontend supports native WASM proving, custom trading router, account management, and pool interaction via web workers.

Privacy is achieved by encoding user addresses in UTXO notes, hiding them during swaps while requiring disclosure in deposits and withdrawals. Nullifiers ensure one-time use of notes, preventing double-spending.

## Technical Specs

- Address is also encoded in the UTXO note and enforced when deposit/withdraw to ensure non-mixing

- $B=H(H(A,N),B_1,B_2,...,B_n)$

- A is address, N is random nonce, and B_n is nth asset balance

- ZK checks for note transition from B_n (before) to B_n (after) and consistent A and N

## Contract Addresses (DEVNET)

The contract is deployed to devnet because _Sui's native Poseidon hash is not available in testnet nor mainnet_.

- Package ID: `0x4549141c9df73d21277cd91f4a7c77cbb81fc23252fc9a03ee64eccbeaa77f73`
- Shroud Core ID: `0xbf50ae7b87d7120cfbf3bc8027ba5c33899442bb3cb63ce18d3393ea38c92927`
