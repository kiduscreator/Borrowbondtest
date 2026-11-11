/**
 * BorrowBond Real NEAR RPC Verifier & Transaction Integrity Engine
 *
 * Enforces Section 2, 4, 16.3, 16.4, 16.12:
 * - Zero fabricated fallback balances, block heights, code hashes, or public keys.
 * - Independent verification of account existence, access keys, contract code hash,
 *   and transaction outcome/signer/receiver/method/attached-deposit on NEAR RPC.
 * - Strict contract account allowlisting and method allowlisting on NEAR Testnet.
 */

export const NEAR_TESTNET_RPC_PRIMARY =
  (typeof process !== 'undefined' && process.env?.VITE_NEAR_RPC_URL) ||
  'https://rpc.testnet.near.org';

export const NEAR_TESTNET_RPC_FALLBACKS = [
  NEAR_TESTNET_RPC_PRIMARY,
  'https://test.rpc.fastnear.com',
  'https://archival-rpc.testnet.near.org',
];

export const NEAR_MAINNET_RPC_ENDPOINTS = [
  'https://rpc.mainnet.near.org',
  'https://free.rpc.fastnear.com',
];

export const EMPTY_CONTRACT_CODE_HASH = '11111111111111111111111111111111';

export const ALLOWED_ESCROW_METHODS = [
  'new',
  'create_booking',
  'accept_booking',
  'cancel_requested_booking',
  'expire_unaccepted_booking',
  'expire_uncompleted_handover',
  'confirm_handover',
  'request_return',
  'confirm_return_and_complete',
  'finalize_uncontested_return',
  'propose_damage_settlement',
  'accept_damage_proposal',
  'reject_damage_proposal',
  'submit_evidence_hash',
  'open_dispute',
  'resolve_dispute_with_damage_deduction',
  'withdraw_claimable',
  'set_paused',
  'set_designated_resolver',
  'set_platform_fee_config',
] as const;

export type AllowedEscrowMethod = (typeof ALLOWED_ESCROW_METHODS)[number];

export interface NearRpcStatusResult {
  online: boolean;
  status: 'VERIFIED_ONLINE' | 'UNABLE_TO_VERIFY';
  networkId: string;
  latestBlockHeight: number | null;
  latestBlockHash: string | null;
  syncing: boolean;
  rpcEndpoint: string;
  errorReason?: string;
}

export interface NearAccountVerificationResult {
  accountId: string;
  network: 'testnet' | 'mainnet';
  verifiedOnChain: boolean;
  status: 'VERIFIED_ON_CHAIN' | 'ACCOUNT_NOT_FOUND' | 'UNABLE_TO_VERIFY';
  balanceNear: number | null;
  balanceYocto: string | null;
  storageUsageBytes: number | null;
  blockHeight: number | null;
  codeHash: string | null;
  hasDeployedContract: boolean;
  accessKeysCount: number;
  primaryPublicKey: string | null;
  fullAccessKeys: string[];
  functionCallKeys: { publicKey: string; receiverId: string; methodNames: string[] }[];
  rpcEndpoint: string;
  errorReason?: string;
}

export interface NearTransactionVerificationInput {
  txHash: string;
  expectedSignerId: string;
  expectedReceiverContractId: string;
  expectedMethodName: AllowedEscrowMethod;
  expectedAttachedDepositYocto?: string;
  network?: 'testnet' | 'mainnet';
}

export interface NearTransactionVerificationResult {
  verified: boolean;
  status:
    | 'VERIFIED_SUCCESS'
    | 'TX_FAILED_ON_CHAIN'
    | 'SIGNER_MISMATCH'
    | 'RECEIVER_MISMATCH'
    | 'METHOD_MISMATCH'
    | 'DEPOSIT_MISMATCH'
    | 'UNABLE_TO_VERIFY';
  txHash: string;
  signerId: string | null;
  receiverId: string | null;
  methodName: string | null;
  attachedDepositYocto: string | null;
  blockHash: string | null;
  errorReason?: string;
}

export function isValidNearAccountId(accountId: string, requiredNetwork?: 'testnet' | 'mainnet'): boolean {
  const normalized = accountId.trim().toLowerCase();
  if (normalized.length < 2 || normalized.length > 64) return false;
  const nearAccountRegex = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
  if (!nearAccountRegex.test(normalized)) return false;
  if (requiredNetwork === 'testnet') {
    return normalized.endsWith('.testnet') || /^[0-9a-f]{64}$/.test(normalized);
  }
  if (requiredNetwork === 'mainnet') {
    return normalized.endsWith('.near') || /^[0-9a-f]{64}$/.test(normalized);
  }
  return true;
}

export function validateContractCallIntent(params: {
  network: string;
  targetContractId: string;
  allowedContractIds: string[];
  methodName: string;
  attachedDepositYocto: string;
  expectedDepositYocto: string;
  signerAccountId: string;
}): { valid: boolean; error?: string } {
  if (params.network !== 'testnet') {
    return {
      valid: false,
      error: `Network mismatch: BorrowBond escrow requires NEAR testnet, received "${params.network}".`,
    };
  }
  if (!isValidNearAccountId(params.signerAccountId, 'testnet')) {
    return {
      valid: false,
      error: `Invalid NEAR testnet signer account "${params.signerAccountId}".`,
    };
  }
  const normalizedTarget = params.targetContractId.trim().toLowerCase();
  const allowedSet = new Set(params.allowedContractIds.map((c) => c.trim().toLowerCase()));
  if (!allowedSet.has(normalizedTarget)) {
    return {
      valid: false,
      error: `Untrusted contract receiver "${params.targetContractId}". Only allowlisted BorrowBond escrow contracts are permitted.`,
    };
  }
  if (!ALLOWED_ESCROW_METHODS.includes(params.methodName as AllowedEscrowMethod)) {
    return {
      valid: false,
      error: `Disallowed contract method "${params.methodName}". Method is not in the BorrowBond escrow allowlist.`,
    };
  }
  try {
    const attached = BigInt(params.attachedDepositYocto);
    const expected = BigInt(params.expectedDepositYocto);
    if (attached < 0n || attached !== expected) {
      return {
        valid: false,
        error: `Attached deposit mismatch: expected ${expected.toString()} yoctoNEAR, received ${attached.toString()} yoctoNEAR.`,
      };
    }
  } catch {
    return {
      valid: false,
      error: 'Invalid yoctoNEAR deposit string format.',
    };
  }
  return { valid: true };
}

export async function queryNearTestnetRpcStatus(): Promise<NearRpcStatusResult> {
  for (const endpoint of NEAR_TESTNET_RPC_FALLBACKS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'borrowbond-status',
          method: 'status',
          params: [],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const syncInfo = data?.result?.sync_info;
        if (syncInfo && typeof syncInfo.latest_block_height === 'number') {
          return {
            online: true,
            status: 'VERIFIED_ONLINE',
            networkId: data?.result?.chain_id || 'testnet',
            latestBlockHeight: syncInfo.latest_block_height,
            latestBlockHash: syncInfo.latest_block_hash || null,
            syncing: Boolean(syncInfo.syncing),
            rpcEndpoint: endpoint,
          };
        }
      }
    } catch {
      // Try next fallback endpoint
    }
  }

  return {
    online: false,
    status: 'UNABLE_TO_VERIFY',
    networkId: 'testnet',
    latestBlockHeight: null,
    latestBlockHash: null,
    syncing: false,
    rpcEndpoint: NEAR_TESTNET_RPC_PRIMARY,
    errorReason: 'Unable to reach NEAR testnet RPC endpoints. No fabricated block height returned.',
  };
}

export async function queryNearAccountAndKeysLive(
  accountId: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<NearAccountVerificationResult> {
  const normalizedAccount = accountId.trim().toLowerCase();
  const endpoints =
    network === 'mainnet' ? NEAR_MAINNET_RPC_ENDPOINTS : NEAR_TESTNET_RPC_FALLBACKS;

  if (!isValidNearAccountId(normalizedAccount, network)) {
    return {
      accountId: normalizedAccount,
      network,
      verifiedOnChain: false,
      status: 'UNABLE_TO_VERIFY',
      balanceNear: null,
      balanceYocto: null,
      storageUsageBytes: null,
      blockHeight: null,
      codeHash: null,
      hasDeployedContract: false,
      accessKeysCount: 0,
      primaryPublicKey: null,
      fullAccessKeys: [],
      functionCallKeys: [],
      rpcEndpoint: endpoints[0],
      errorReason: `Invalid NEAR ${network} account format: "${normalizedAccount}"`,
    };
  }

  let lastError = 'Unable to reach NEAR RPC';

  for (const rpcUrl of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3800);

      const [accRes, keyRes] = await Promise.all([
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'verify-account',
            method: 'query',
            params: {
              request_type: 'view_account',
              finality: 'final',
              account_id: normalizedAccount,
            },
          }),
          signal: controller.signal,
        }),
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'verify-keys',
            method: 'query',
            params: {
              request_type: 'view_access_key_list',
              finality: 'final',
              account_id: normalizedAccount,
            },
          }),
          signal: controller.signal,
        }),
      ]);
      clearTimeout(timeout);

      if (!accRes.ok) {
        lastError = `HTTP ${accRes.status} from ${rpcUrl}`;
        continue;
      }

      const accJson = await accRes.json();
      if (accJson?.error) {
        const errName = accJson.error?.cause?.name || accJson.error?.message || 'UNKNOWN_ACCOUNT';
        if (String(errName).includes('UNKNOWN_ACCOUNT') || String(errName).includes('does not exist')) {
          return {
            accountId: normalizedAccount,
            network,
            verifiedOnChain: false,
            status: 'ACCOUNT_NOT_FOUND',
            balanceNear: null,
            balanceYocto: null,
            storageUsageBytes: null,
            blockHeight: null,
            codeHash: null,
            hasDeployedContract: false,
            accessKeysCount: 0,
            primaryPublicKey: null,
            fullAccessKeys: [],
            functionCallKeys: [],
            rpcEndpoint: rpcUrl,
            errorReason: `Account "${normalizedAccount}" does not exist on NEAR ${network}.`,
          };
        }
        lastError = String(errName);
        continue;
      }

      const result = accJson?.result;
      if (!result || typeof result.amount !== 'string') {
        lastError = 'Malformed view_account response from RPC';
        continue;
      }

      const yocto = BigInt(result.amount);
      const balanceNear = Number(yocto / BigInt(1e20)) / 10000;
      const codeHash = typeof result.code_hash === 'string' ? result.code_hash : null;
      const hasDeployedContract = Boolean(codeHash && codeHash !== EMPTY_CONTRACT_CODE_HASH);

      const fullAccessKeys: string[] = [];
      const functionCallKeys: { publicKey: string; receiverId: string; methodNames: string[] }[] = [];
      let primaryPublicKey: string | null = null;

      if (keyRes.ok) {
        const keyJson = await keyRes.json();
        const keys = Array.isArray(keyJson?.result?.keys) ? keyJson.result.keys : [];
        for (const k of keys) {
          const pubKey = String(k?.public_key || '');
          if (!pubKey) continue;
          if (!primaryPublicKey) primaryPublicKey = pubKey;
          if (k?.access_key?.permission === 'FullAccess') {
            fullAccessKeys.push(pubKey);
          } else if (k?.access_key?.permission?.FunctionCall) {
            const fc = k.access_key.permission.FunctionCall;
            functionCallKeys.push({
              publicKey: pubKey,
              receiverId: String(fc.receiver_id || ''),
              methodNames: Array.isArray(fc.method_names) ? fc.method_names : [],
            });
          }
        }
      }

      return {
        accountId: normalizedAccount,
        network,
        verifiedOnChain: true,
        status: 'VERIFIED_ON_CHAIN',
        balanceNear,
        balanceYocto: result.amount,
        storageUsageBytes: typeof result.storage_usage === 'number' ? result.storage_usage : null,
        blockHeight: typeof result.block_height === 'number' ? result.block_height : null,
        codeHash,
        hasDeployedContract,
        accessKeysCount: fullAccessKeys.length + functionCallKeys.length,
        primaryPublicKey,
        fullAccessKeys,
        functionCallKeys,
        rpcEndpoint: rpcUrl,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'RPC request timed out';
    }
  }

  return {
    accountId: normalizedAccount,
    network,
    verifiedOnChain: false,
    status: 'UNABLE_TO_VERIFY',
    balanceNear: null,
    balanceYocto: null,
    storageUsageBytes: null,
    blockHeight: null,
    codeHash: null,
    hasDeployedContract: false,
    accessKeysCount: 0,
    primaryPublicKey: null,
    fullAccessKeys: [],
    functionCallKeys: [],
    rpcEndpoint: endpoints[0],
    errorReason: `Unable to verify on-chain state: ${lastError}`,
  };
}

export async function verifyNearTransactionOnChain(
  input: NearTransactionVerificationInput
): Promise<NearTransactionVerificationResult> {
  const network = input.network || 'testnet';
  const endpoints =
    network === 'mainnet' ? NEAR_MAINNET_RPC_ENDPOINTS : NEAR_TESTNET_RPC_FALLBACKS;
  const txHash = input.txHash.trim();

  if (!txHash || txHash.length < 20) {
    return {
      verified: false,
      status: 'UNABLE_TO_VERIFY',
      txHash,
      signerId: null,
      receiverId: null,
      methodName: null,
      attachedDepositYocto: null,
      blockHash: null,
      errorReason: 'Invalid or missing NEAR transaction hash.',
    };
  }

  for (const rpcUrl of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'verify-tx',
          method: 'EXPERIMENTAL_tx_status',
          params: [txHash, input.expectedSignerId],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const json = await res.json();
      if (json?.error || !json?.result) continue;

      const tx = json.result.transaction;
      const status = json.result.status;
      const signerId = String(tx?.signer_id || '');
      const receiverId = String(tx?.receiver_id || '');
      const actions = Array.isArray(tx?.actions) ? tx.actions : [];
      const fnCall = actions.find((a: Record<string, unknown>) => a && typeof a === 'object' && 'FunctionCall' in a)
        ?.FunctionCall as
        | { method_name?: string; deposit?: string; args?: string }
        | undefined;

      const methodName = fnCall?.method_name || null;
      const attachedDepositYocto = fnCall?.deposit || '0';
      const blockHash = String(json.result.transaction_outcome?.block_hash || '');

      if (status?.Failure) {
        return {
          verified: false,
          status: 'TX_FAILED_ON_CHAIN',
          txHash,
          signerId,
          receiverId,
          methodName,
          attachedDepositYocto,
          blockHash,
          errorReason: 'Transaction execution failed on NEAR blockchain.',
        };
      }

      if (signerId.toLowerCase() !== input.expectedSignerId.trim().toLowerCase()) {
        return {
          verified: false,
          status: 'SIGNER_MISMATCH',
          txHash,
          signerId,
          receiverId,
          methodName,
          attachedDepositYocto,
          blockHash,
          errorReason: `Transaction signer "${signerId}" does not match expected signer "${input.expectedSignerId}".`,
        };
      }

      if (receiverId.toLowerCase() !== input.expectedReceiverContractId.trim().toLowerCase()) {
        return {
          verified: false,
          status: 'RECEIVER_MISMATCH',
          txHash,
          signerId,
          receiverId,
          methodName,
          attachedDepositYocto,
          blockHash,
          errorReason: `Transaction receiver "${receiverId}" does not match allowlisted escrow contract "${input.expectedReceiverContractId}".`,
        };
      }

      if (methodName !== input.expectedMethodName) {
        return {
          verified: false,
          status: 'METHOD_MISMATCH',
          txHash,
          signerId,
          receiverId,
          methodName,
          attachedDepositYocto,
          blockHash,
          errorReason: `Transaction method "${methodName}" does not match expected method "${input.expectedMethodName}".`,
        };
      }

      if (
        input.expectedAttachedDepositYocto !== undefined &&
        BigInt(attachedDepositYocto) !== BigInt(input.expectedAttachedDepositYocto)
      ) {
        return {
          verified: false,
          status: 'DEPOSIT_MISMATCH',
          txHash,
          signerId,
          receiverId,
          methodName,
          attachedDepositYocto,
          blockHash,
          errorReason: `Attached deposit ${attachedDepositYocto} yoctoNEAR does not match required ${input.expectedAttachedDepositYocto} yoctoNEAR.`,
        };
      }

      return {
        verified: true,
        status: 'VERIFIED_SUCCESS',
        txHash,
        signerId,
        receiverId,
        methodName,
        attachedDepositYocto,
        blockHash,
      };
    } catch {
      // Try next RPC endpoint
    }
  }

  return {
    verified: false,
    status: 'UNABLE_TO_VERIFY',
    txHash,
    signerId: null,
    receiverId: null,
    methodName: null,
    attachedDepositYocto: null,
    blockHash: null,
    errorReason: 'Transaction hash could not be verified on NEAR testnet RPC.',
  };
}
