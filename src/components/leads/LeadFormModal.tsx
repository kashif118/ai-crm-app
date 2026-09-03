"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { OWNERS, STAGE_META } from "@/lib/constants";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/types";
import type { Lead, LeadDraft, LeadSource, LeadStage } from "@/lib/types";
import { isValidEmail } from "@/lib/utils";

type Errors = Partial<Record<keyof LeadDraft, string>>;

/** Ties the footer's submit button to the form across the modal's DOM split. */
const FORM_ID = "lead-form";

const BLANK: LeadDraft = {
  name: "",
  company: "",
  email: "",
  phone: "",
  stage: "new",
  value: 0,
  source: "Inbound",
  owner: OWNERS[0],
  notes: "",
  lastContactedAt: null,
};

function toDraft(lead: Lead | null | undefined): LeadDraft {
  if (!lead) return BLANK;
  return {
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    stage: lead.stage,
    value: lead.value,
    source: lead.source,
    owner: lead.owner,
    notes: lead.notes,
    lastContactedAt: lead.lastContactedAt,
  };
}

/** `<input type="date">` wants YYYY-MM-DD, not a full ISO timestamp. */
function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

export function LeadFormModal({
  open,
  onClose,
  onSubmit,
  lead,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: LeadDraft) => void;
  /** Present when editing; omitted when creating. */
  lead?: Lead | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? "Edit lead" : "Add lead"}
      description={
        lead
          ? `Update ${lead.company}. Changes are saved to this browser immediately.`
          : "Create a new contact and drop it straight into the pipeline."
      }
      size="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID} variant="primary">
            {lead ? "Save changes" : "Add lead"}
          </Button>
        </>
      }
    >
      {/* Keyed by the record being edited: switching leads (or closing and
          reopening, which unmounts the modal) gives a clean form with no
          state left over from the last edit. */}
      <LeadForm
        key={lead?.id ?? "new"}
        initial={toDraft(lead)}
        onSubmit={(draft) => {
          onSubmit(draft);
          onClose();
        }}
      />
    </Modal>
  );
}

function LeadForm({
  initial,
  onSubmit,
}: {
  initial: LeadDraft;
  onSubmit: (draft: LeadDraft) => void;
}) {
  const [draft, setDraft] = useState<LeadDraft>(initial);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof LeadDraft>(key: K, value: LeadDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const next: Errors = {};
    if (!draft.name.trim()) next.name = "Contact name is required.";
    if (!draft.company.trim()) next.company = "Company is required.";
    if (!draft.email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(draft.email)) next.email = "That does not look like a valid email.";
    if (draft.value < 0) next.value = "Deal value cannot be negative.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      ...draft,
      name: draft.name.trim(),
      company: draft.company.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      notes: draft.notes.trim(),
    });
  };

  return (
    <form
      id={FORM_ID}
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        label="Contact name"
        value={draft.name}
        onChange={(event) => set("name", event.target.value)}
        error={errors.name}
        placeholder="Dana Whitfield"
        autoComplete="off"
      />
      <TextField
        label="Company"
        value={draft.company}
        onChange={(event) => set("company", event.target.value)}
        error={errors.company}
        placeholder="Northwind Logistics"
        autoComplete="off"
      />
      <TextField
        label="Email"
        type="email"
        value={draft.email}
        onChange={(event) => set("email", event.target.value)}
        error={errors.email}
        hint="A corporate domain scores higher than a personal one."
        placeholder="dana@northwind.co"
        autoComplete="off"
      />
      <TextField
        label="Phone"
        value={draft.phone}
        onChange={(event) => set("phone", event.target.value)}
        placeholder="+1 (415) 555-0132"
        autoComplete="off"
      />

      <SelectField
        label="Stage"
        value={draft.stage}
        onChange={(event) => set("stage", event.target.value as LeadStage)}
      >
        {LEAD_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_META[stage].label}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Deal value (USD)"
        type="number"
        min={0}
        step={1000}
        value={draft.value}
        onChange={(event) => set("value", Number(event.target.value) || 0)}
        error={errors.value}
      />

      <SelectField
        label="Source"
        value={draft.source}
        onChange={(event) => set("source", event.target.value as LeadSource)}
      >
        {LEAD_SOURCES.map((source) => (
          <option key={source} value={source}>
            {source}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Owner"
        value={draft.owner}
        onChange={(event) => set("owner", event.target.value)}
      >
        {OWNERS.map((owner) => (
          <option key={owner} value={owner}>
            {owner}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Last contacted"
        type="date"
        value={toDateInput(draft.lastContactedAt)}
        onChange={(event) =>
          set(
            "lastContactedAt",
            event.target.value ? new Date(event.target.value).toISOString() : null,
          )
        }
        hint="Leave empty if you have not reached out yet."
      />

      <div className="sm:col-span-2">
        <TextAreaField
          label="Notes"
          rows={3}
          value={draft.notes}
          onChange={(event) => set("notes", event.target.value)}
          placeholder="Budget confirmed, security review is the gating item…"
        />
      </div>
    </form>
  );
}
