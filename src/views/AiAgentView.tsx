import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Terminal,
  Sliders,
  Lock,
} from 'lucide-react';
import type { SpendingPolicy } from '../lib/security/policyEngine';
import type { AgentOrchestrationResponse, BookingDraft } from '../lib/ai/agentTools';

interface AiAgentViewProps {
  connectedWallet: string;
  policy: SpendingPolicy;
  initialPrompt?: string;
  lastAgentResult: AgentOrchestrationResponse | null;
  onRunAgentPrompt: (prompt: string) => Promise<void>;
  onUpdatePolicy: (updated: Partial<SpendingPolicy>) => Promise<void>;
  onApproveDraftToCheckout: (draft: BookingDraft) => void;
}

export const AiAgentView: React.FC<AiAgentViewProps> = ({
  connectedWallet,
  policy,
  initialPrompt,
  lastAgentResult,
  onRunAgentPrompt,
  onUpdatePolicy,
  onApproveDraftToCheckout,
}) => {
  const [promptInput, setPromptInput] = useState(
    initialPrompt ||
      'I need a camera for three days. My total budget is 0.5 NEAR. Find a reliable offer with reasonable collateral.'
  );
  const [running, setRunning] = useState(false);

  // Policy Editor state
  const [maxFee, setMaxFee] = useState(String(policy.maxRentalFeeNear));
  const [maxCol, setMaxCol] = useState(String(policy.maxCollateralNear));
  const [maxTotal, setMaxTotal] = useState(String(policy.maxTotalPaymentNear));
  const [maxDays, setMaxDays] = useState(String(policy.maxDurationDays));
  const [policySavedMessage, setPolicySavedMessage] = useState<string | null>(null);

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setRunning(true);
    try {
      await onRunAgentPrompt(promptInput.trim());
    } finally {
      setRunning(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePolicy({
      maxRentalFeeNear: parseFloat(maxFee) || 0.25,
      maxCollateralNear: parseFloat(maxCol) || 0.5,
      maxTotalPaymentNear: parseFloat(maxTotal) || 0.6,
      maxDurationDays: parseInt(maxDays, 10) || 7,
    });
    setPolicySavedMessage('Spending policy updated and enforced deterministically on backend.');
    setTimeout(() => setPolicySavedMessage(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-[#5EEAD4]">Agent Economy & AI Security Layer</p>
          <h1 className="text-3xl font-bold font-display text-[#F3F6FC]">
            AI Borrowing & Security Agent
          </h1>
          <p className="text-sm text-[#A4B0C4]">
            Tool-using assistant that searches real inventory, compares rental fees vs. collateral, enforces your spending limits, and prepares unsigned NEAR escrow agreements.
          </p>
        </div>
        <div className="text-xs text-[#A4B0C4] font-mono">
          Acting for account: <strong className="text-[#F3F6FC]">{connectedWallet}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Columns: Natural Language Prompt, Comparison Table, Prepared Draft & Tool Execution Trace */}
        <div className="lg:col-span-8 space-y-6">
          {/* Natural Language Request Form */}
          <form
            onSubmit={handleSubmitPrompt}
            className="bg-[#172338] border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <label htmlFor="agent-nl-input" className="text-xs font-semibold text-[#F3F6FC]">
                Natural-Language Borrowing Request
              </label>
              <span className="text-[11px] text-[#A4B0C4]">
                Never auto-signs transactions · Human wallet approval required
              </span>
            </div>

            <textarea
              id="agent-nl-input"
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#5EEAD4]"
              placeholder="Describe the physical or digital resource you need, duration, and total NEAR budget..."
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#A4B0C4]">
                <span>Example prompts:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPromptInput(
                      'I need a camera for three days. My total budget is 0.5 NEAR. Find a reliable offer with reasonable collateral.'
                    )
                  }
                  className="underline hover:text-[#F3F6FC] cursor-pointer"
                >
                  Camera (3 days, 0.5 NEAR)
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() =>
                    setPromptInput(
                      'I need a digital API for my project for two days. My total budget is 0.15 NEAR. Find the best option.'
                    )
                  }
                  className="underline hover:text-[#F3F6FC] cursor-pointer"
                >
                  Digital API (2 days, 0.15 NEAR)
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() =>
                    setPromptInput(
                      'I need a camera for 3 days. My total budget is 0.04 NEAR.'
                    )
                  }
                  className="underline hover:text-[#F87171] cursor-pointer"
                >
                  Test Budget Refusal (0.04 NEAR)
                </button>
              </div>

              <button
                type="submit"
                disabled={running}
                className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{running ? 'Running Agent Tools...' : 'Run AI Borrowing Agent'}</span>
              </button>
            </div>
          </form>

          {/* Agent Results */}
          {lastAgentResult && (
            <div className="space-y-6">
              {/* Summary & Extracted Intent */}
              <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A4B0C4]">
                  <span className="font-semibold text-[#5EEAD4]">
                    Agent Recommendation & Security Assessment
                  </span>
                  <span className="font-mono">
                    Extracted: Type={lastAgentResult.intent.resourceType} · Duration={lastAgentResult.intent.requestedDuration} {lastAgentResult.intent.durationUnit.toLowerCase()}
                    {lastAgentResult.intent.budgetNear !== undefined
                      ? ` · Budget=${lastAgentResult.intent.budgetNear} NEAR`
                      : ''}
                  </span>
                </div>

                <p className="text-sm text-[#F3F6FC] leading-relaxed">
                  {lastAgentResult.explanation}
                </p>

                {/* Prepared Unsigned Booking Draft */}
                {lastAgentResult.preparedDraft && (
                  <div className="p-5 rounded-xl bg-[#172338] border border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-xs text-[#5EEAD4] block">
                          Unsigned Agreement Draft Ready ({lastAgentResult.preparedDraft.draftId})
                        </span>
                        <h3 className="text-base font-bold font-display text-[#F3F6FC]">
                          {lastAgentResult.preparedDraft.listingTitle}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-[#34D399]">
                        Policy Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-[#0B1020] rounded-lg">
                        <span className="text-[#A4B0C4] block">Rental Fee ({lastAgentResult.preparedDraft.durationCount} {lastAgentResult.preparedDraft.durationUnit.toLowerCase()})</span>
                        <span className="font-mono font-bold text-[#F3F6FC] text-sm tabular-nums">
                          {lastAgentResult.preparedDraft.rentalFeeNear} NEAR
                        </span>
                      </div>
                      <div className="p-3 bg-[#0B1020] rounded-lg">
                        <span className="text-[#A4B0C4] block">Refundable Collateral</span>
                        <span className="font-mono font-bold text-[#5EEAD4] text-sm tabular-nums">
                          {lastAgentResult.preparedDraft.collateralNear} NEAR
                        </span>
                      </div>
                      <div className="p-3 bg-[#0B1020] rounded-lg">
                        <span className="text-[#A4B0C4] block">Total Escrow Deposit</span>
                        <span className="font-mono font-bold text-[#F3F6FC] text-sm tabular-nums">
                          {lastAgentResult.preparedDraft.totalRequiredNear} NEAR
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 text-xs text-[#A4B0C4]">
                        <Lock className="w-3.5 h-3.5 text-[#5EEAD4]" />
                        <span>Requires your explicit approval & NEAR wallet signature on the next step.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApproveDraftToCheckout(lastAgentResult.preparedDraft!)}
                        className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Review & Sign in Checkout</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Offer Comparison Matrix */}
              <div className="bg-[#121B2C] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                    Offer Comparison Matrix (`compare_offers`)
                  </h2>
                  <span className="text-xs text-[#A4B0C4]">
                    {lastAgentResult.comparisons.length} Offer(s) Evaluated
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[#A4B0C4] bg-[#0B1020]/60">
                        <th className="py-3 px-4 font-medium">Resource</th>
                        <th className="py-3 px-4 font-medium">Provider Deals</th>
                        <th className="py-3 px-4 font-medium text-right">Rental Fee</th>
                        <th className="py-3 px-4 font-medium text-right">Collateral</th>
                        <th className="py-3 px-4 font-medium text-right">Total Escrow</th>
                        <th className="py-3 px-4 font-medium">Policy Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {lastAgentResult.comparisons.map((row) => (
                        <tr key={row.listingId} className="hover:bg-[#172338]/50">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#F3F6FC]">{row.title}</div>
                            <div className="text-[11px] text-[#A4B0C4]">
                              {row.resourceType} · {row.durationLabel}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-[#A4B0C4]">
                            {row.providerCompletedDeals} deals ({row.providerDisputes} disputes)
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[#F3F6FC]">
                            {row.rentalFeeNear} NEAR
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right text-[#5EEAD4]">
                            {row.collateralNear} NEAR
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-[#F3F6FC]">
                            {row.totalEscrowNear} NEAR
                          </td>
                          <td className="py-3 px-4">
                            {row.policyCompliant ? (
                              <span className="text-[#34D399] font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Compliant</span>
                              </span>
                            ) : (
                              <div className="text-[#F87171] space-y-0.5">
                                <span className="font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Blocked</span>
                                </span>
                                <p className="text-[11px] text-[#A4B0C4] max-w-xs">
                                  {row.policyViolations[0]}
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verified Tool Call Audit Log */}
              <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F6FC]">
                  <Terminal className="w-4 h-4 text-[#8297FF]" />
                  <h2>Agent Tool Execution Trace</h2>
                </div>
                <div className="space-y-2">
                  {lastAgentResult.toolTrace.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-[#0B1020] border border-slate-800/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <code className="font-mono text-[#5EEAD4] font-semibold">
                          {log.toolName}()
                        </code>
                        <p className="text-[#A4B0C4]">{log.summary}</p>
                      </div>
                      <span className="font-mono text-[11px] text-[#A4B0C4] shrink-0">
                        {log.success ? 'SUCCESS' : 'BLOCKED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: AI Security Agent Policy Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <form
            onSubmit={handleSavePolicy}
            className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-[#8297FF]" />
              <h2 className="text-sm font-bold font-display text-[#F3F6FC]">
                AI Security & Spending Policy
              </h2>
            </div>

            <p className="text-xs text-[#A4B0C4] leading-relaxed">
              Deterministic backend rules that the AI Borrowing Agent cannot override. Protects your wallet from over-budget fees, excessive collateral, and untrusted listing directives.
            </p>

            {policySavedMessage && (
              <div className="p-3 rounded-lg bg-[#34D399]/10 border border-[#34D399]/40 text-xs text-[#34D399]">
                {policySavedMessage}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="pol-max-fee" className="block text-[#A4B0C4] mb-1">
                  Maximum Rental Fee (NEAR)
                </label>
                <input
                  id="pol-max-fee"
                  type="number"
                  step="0.01"
                  value={maxFee}
                  onChange={(e) => setMaxFee(e.target.value)}
                  className="w-full px-3 py-2 font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>

              <div>
                <label htmlFor="pol-max-col" className="block text-[#A4B0C4] mb-1">
                  Maximum Refundable Collateral (NEAR)
                </label>
                <input
                  id="pol-max-col"
                  type="number"
                  step="0.01"
                  value={maxCol}
                  onChange={(e) => setMaxCol(e.target.value)}
                  className="w-full px-3 py-2 font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#5EEAD4]"
                />
              </div>

              <div>
                <label htmlFor="pol-max-tot" className="block text-[#A4B0C4] mb-1">
                  Maximum Total Escrow Deposit (NEAR)
                </label>
                <input
                  id="pol-max-tot"
                  type="number"
                  step="0.01"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  className="w-full px-3 py-2 font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>

              <div>
                <label htmlFor="pol-max-days" className="block text-[#A4B0C4] mb-1">
                  Maximum Borrowing Duration (Days)
                </label>
                <input
                  id="pol-max-days"
                  type="number"
                  value={maxDays}
                  onChange={(e) => setMaxDays(e.target.value)}
                  className="w-full px-3 py-2 font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[#F3F6FC] font-medium">Manual Wallet Signing Required</span>
                <span className="font-mono text-[#34D399] font-semibold">ALWAYS ON</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#172338] text-[#F3F6FC] border border-slate-700 hover:border-[#5EEAD4] transition-colors cursor-pointer"
            >
              Update Security Policy
            </button>
          </form>

          <div className="bg-[#121B2C] border border-slate-800 rounded-xl p-5 space-y-2 text-xs text-[#A4B0C4]">
            <div className="flex items-center gap-2 text-[#F3F6FC] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" />
              <span>Prompt-Injection Defense Active</span>
            </div>
            <p className="leading-relaxed">
              All provider descriptions and conditions are treated as untrusted user input and scanned for instruction-override patterns before tool evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
