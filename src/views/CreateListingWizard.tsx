import React, { useState } from 'react';
import { Camera, Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { MarketplaceListing } from '../lib/security/policyEngine';

interface CreateListingWizardProps {
  connectedWallet: string;
  onCreated: (newListing: MarketplaceListing) => void;
  onCancel: () => void;
}

export const CreateListingWizard: React.FC<CreateListingWizardProps> = ({
  connectedWallet,
  onCreated,
  onCancel,
}) => {
  const [resourceType, setResourceType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cameras & Optics');
  const [rentalFeeNear, setRentalFeeNear] = useState('0.05');
  const [collateralNear, setCollateralNear] = useState('0.20');
  const [durationUnit, setDurationUnit] = useState<'DAYS' | 'HOURS'>('DAYS');
  const [minDuration, setMinDuration] = useState('1');
  const [maxDuration, setMaxDuration] = useState('5');
  const [conditions, setConditions] = useState(
    'Must be handled carefully and returned in identical condition. Both parties confirm handover and return on-chain.'
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    '100% automatic refund if cancelled prior to lender acceptance.'
  );

  // Physical fields
  const [ownerEstimatedValueNear, setOwnerEstimatedValueNear] = useState('0.30');
  const [itemCondition, setItemCondition] = useState('Excellent — Fully tested and calibrated');
  const [includedAccessories, setIncludedAccessories] = useState(
    'Hard protective case, power cable, manual'
  );
  const [pickupReturnInstructions, setPickupReturnInstructions] = useState(
    'In-person studio pickup using BorrowBond one-time handover code.'
  );

  // Digital fields
  const [digitalServiceType, setDigitalServiceType] = useState('Controlled REST Telemetry API');
  const [accessScope, setAccessScope] = useState('read:telemetry (Read-Only)');
  const [usageQuotaRequests, setUsageQuotaRequests] = useState('25');
  const [expirationBehavior, setExpirationBehavior] = useState(
    'Automatic server-side token revocation upon quota exhaustion or rental expiry.'
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleResourceTypeSwitch = (type: 'PHYSICAL' | 'DIGITAL') => {
    setResourceType(type);
    if (type === 'DIGITAL') {
      setCategory('Weather & Telemetry API');
      setDurationUnit('HOURS');
      setMinDuration('24');
      setMaxDuration('72');
      setRentalFeeNear('0.03');
      setCollateralNear('0.05');
    } else {
      setCategory('Cameras & Optics');
      setDurationUnit('DAYS');
      setMinDuration('1');
      setMaxDuration('5');
      setRentalFeeNear('0.05');
      setCollateralNear('0.20');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const fee = parseFloat(rentalFeeNear);
    const col = parseFloat(collateralNear);
    const minD = parseInt(minDuration, 10);
    const maxD = parseInt(maxDuration, 10);

    if (title.trim().length < 4) {
      setErrorMsg('Resource title must be at least 4 characters.');
      return;
    }
    if (description.trim().length < 15) {
      setErrorMsg('Description must be at least 15 characters.');
      return;
    }
    if (!Number.isFinite(fee) || fee <= 0) {
      setErrorMsg('Rental fee must be greater than 0 NEAR.');
      return;
    }
    if (!Number.isFinite(col) || col < 0) {
      setErrorMsg('Required collateral cannot be negative.');
      return;
    }
    if (!Number.isFinite(minD) || minD <= 0 || !Number.isFinite(maxD) || maxD < minD) {
      setErrorMsg('Maximum duration must be greater than or equal to minimum duration.');
      return;
    }
    if (conditions.trim().length < 10) {
      setErrorMsg('Please specify clear borrowing conditions (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerWallet: connectedWallet,
          resourceType,
          title: title.trim(),
          description: description.trim(),
          category,
          rentalFeeNear: fee,
          collateralNear: col,
          durationUnit,
          minDuration: minD,
          maxDuration: maxD,
          conditions: conditions.trim(),
          cancellationPolicy: cancellationPolicy.trim(),
          ownerEstimatedValueNear: parseFloat(ownerEstimatedValueNear) || col * 1.3,
          itemCondition,
          includedAccessories,
          pickupReturnInstructions,
          digitalServiceType,
          accessScope,
          usageQuotaRequests: parseInt(usageQuotaRequests, 10) || 20,
          expirationBehavior,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to publish listing');
      } else {
        onCreated(data.listing);
      }
    } catch {
      setErrorMsg('Network error publishing listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <div className="border-b border-slate-800 pb-5 space-y-1">
        <p className="text-xs text-[#5EEAD4]">Provider Onboarding Wizard</p>
        <h1 className="text-2xl font-bold font-display text-[#F3F6FC]">
          List a Resource on BorrowBond
        </h1>
        <p className="text-xs text-[#A4B0C4]">
          Define transparent rental fees, refundable NEAR collateral, and physical handover or digital quota rules.
        </p>
      </div>

      {/* Step 1: Select Physical vs Digital */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Resource Type">
        <button
          type="button"
          onClick={() => handleResourceTypeSwitch('PHYSICAL')}
          className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
            resourceType === 'PHYSICAL'
              ? 'bg-[#172338] border-[#5EEAD4]'
              : 'bg-[#121B2C] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold font-display text-[#F3F6FC]">Physical Resource</span>
            <Camera className="w-4 h-4 text-[#5EEAD4]" />
          </div>
          <p className="text-xs text-[#A4B0C4]">
            Cameras, projectors, drones, tools. Uses before/after condition evidence and both-party handover confirmation.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleResourceTypeSwitch('DIGITAL')}
          className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
            resourceType === 'DIGITAL'
              ? 'bg-[#172338] border-[#8297FF]'
              : 'bg-[#121B2C] border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold font-display text-[#F3F6FC]">Digital Resource</span>
            <Cpu className="w-4 h-4 text-[#8297FF]" />
          </div>
          <p className="text-xs text-[#A4B0C4]">
            APIs, compute capacity, datasets. Issues temporary bearer tokens with server-enforced quotas and expiration.
          </p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#121B2C] border border-slate-800 rounded-xl p-6 space-y-5">
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-[#F87171]/10 border border-[#F87171]/40 text-xs text-[#F87171] flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="wiz-title" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Resource Title *
            </label>
            <input
              id="wiz-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                resourceType === 'PHYSICAL'
                  ? 'e.g., Sony FX3 Cinema Camera Kit'
                  : 'e.g., Geospatial Elevation API — 50 Request Slot'
              }
              className="w-full px-3.5 py-2 text-sm bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#5EEAD4]"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="wiz-desc" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Detailed Description *
            </label>
            <textarea
              id="wiz-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe specifications, included items or API capabilities, and intended use..."
              className="w-full px-3.5 py-2 text-sm bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC] focus:outline-none focus:border-[#5EEAD4]"
            />
          </div>

          <div>
            <label htmlFor="wiz-cat" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Category
            </label>
            <select
              id="wiz-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            >
              {resourceType === 'PHYSICAL' ? (
                <>
                  <option value="Cameras & Optics">Cameras & Optics</option>
                  <option value="Audio & Projection">Audio & Projection</option>
                  <option value="Drones & Robotics">Drones & Robotics</option>
                </>
              ) : (
                <>
                  <option value="Weather & Telemetry API">Weather & Telemetry API</option>
                  <option value="GPU & AI Compute">GPU & AI Compute</option>
                  <option value="Licensed Datasets">Licensed Datasets</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="wiz-unit" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Duration Unit
            </label>
            <select
              id="wiz-unit"
              value={durationUnit}
              onChange={(e) => setDurationUnit(e.target.value as 'DAYS' | 'HOURS')}
              className="w-full px-3.5 py-2 text-sm bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            >
              <option value="DAYS">Days</option>
              <option value="HOURS">Hours</option>
            </select>
          </div>

          <div>
            <label htmlFor="wiz-fee" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Rental Fee (Testnet NEAR) *
            </label>
            <input
              id="wiz-fee"
              type="number"
              step="0.01"
              value={rentalFeeNear}
              onChange={(e) => setRentalFeeNear(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            />
          </div>

          <div>
            <label htmlFor="wiz-col" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Required Refundable Collateral (Testnet NEAR) *
            </label>
            <input
              id="wiz-col"
              type="number"
              step="0.01"
              value={collateralNear}
              onChange={(e) => setCollateralNear(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#5EEAD4]"
            />
          </div>

          <div>
            <label htmlFor="wiz-min" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Minimum Duration ({durationUnit.toLowerCase()})
            </label>
            <input
              id="wiz-min"
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            />
          </div>

          <div>
            <label htmlFor="wiz-max" className="block text-xs font-medium text-[#A4B0C4] mb-1">
              Maximum Duration ({durationUnit.toLowerCase()})
            </label>
            <input
              id="wiz-max"
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            />
          </div>
        </div>

        {/* Resource-Type Specific Section */}
        {resourceType === 'PHYSICAL' ? (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h2 className="text-xs font-semibold text-[#5EEAD4]">
              Physical Hardware Verification Fields
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-val" className="block text-xs text-[#A4B0C4] mb-1">
                  Owner-Estimated Value (NEAR)
                </label>
                <input
                  id="wiz-val"
                  type="number"
                  step="0.01"
                  value={ownerEstimatedValueNear}
                  onChange={(e) => setOwnerEstimatedValueNear(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
              <div>
                <label htmlFor="wiz-cond" className="block text-xs text-[#A4B0C4] mb-1">
                  Current Item Condition
                </label>
                <input
                  id="wiz-cond"
                  type="text"
                  value={itemCondition}
                  onChange={(e) => setItemCondition(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-acc" className="block text-xs text-[#A4B0C4] mb-1">
                  Included Accessories (comma-separated)
                </label>
                <input
                  id="wiz-acc"
                  type="text"
                  value={includedAccessories}
                  onChange={(e) => setIncludedAccessories(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-pickup" className="block text-xs text-[#A4B0C4] mb-1">
                  Pickup & Return Instructions
                </label>
                <input
                  id="wiz-pickup"
                  type="text"
                  value={pickupReturnInstructions}
                  onChange={(e) => setPickupReturnInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h2 className="text-xs font-semibold text-[#8297FF]">
              Digital Access & Quota Provisioning Fields (No Plaintext Secrets Stored)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="wiz-dtype" className="block text-xs text-[#A4B0C4] mb-1">
                  Service Type
                </label>
                <input
                  id="wiz-dtype"
                  type="text"
                  value={digitalServiceType}
                  onChange={(e) => setDigitalServiceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
              <div>
                <label htmlFor="wiz-quota" className="block text-xs text-[#A4B0C4] mb-1">
                  Permitted Usage Quota (API Requests)
                </label>
                <input
                  id="wiz-quota"
                  type="number"
                  value={usageQuotaRequests}
                  onChange={(e) => setUsageQuotaRequests(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-scope" className="block text-xs text-[#A4B0C4] mb-1">
                  Allowed Permissions / Access Scope
                </label>
                <input
                  id="wiz-scope"
                  type="text"
                  value={accessScope}
                  onChange={(e) => setAccessScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="wiz-exp" className="block text-xs text-[#A4B0C4] mb-1">
                  Expiration & Revocation Behavior
                </label>
                <input
                  id="wiz-exp"
                  type="text"
                  value={expirationBehavior}
                  onChange={(e) => setExpirationBehavior(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-4 border-t border-slate-800">
          <div>
            <label htmlFor="wiz-terms" className="block text-xs text-[#A4B0C4] mb-1">
              Borrowing Conditions & Restrictions *
            </label>
            <textarea
              id="wiz-terms"
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            />
          </div>
          <div>
            <label htmlFor="wiz-cancel" className="block text-xs text-[#A4B0C4] mb-1">
              Cancellation Policy
            </label>
            <input
              id="wiz-cancel"
              type="text"
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0B1020] border border-slate-800 rounded-lg text-[#F3F6FC]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#A4B0C4] hover:text-[#F3F6FC] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#5EEAD4] text-[#0B1020] hover:bg-[#5EEAD4]/90 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Publishing Listing...' : 'Publish Resource Listing'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
