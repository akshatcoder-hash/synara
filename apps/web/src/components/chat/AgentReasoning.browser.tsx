import "../../index.css";

import { useState } from "react";
import { page } from "vitest/browser";
import { expect, it } from "vitest";
import { render } from "vitest-browser-react";

import type { WorkLogEntry } from "../../workLog";
import { AgentActivityDetailView } from "./AgentActivityDetailView";
import { deriveAgentActivityTimelineState } from "./agentActivity.logic";
import { TimelineWorkEntryRow } from "./TimelineWorkEntryRow";

const initialDetail = "I will inspect the provider event mapping before changing the transcript.";
const finalDetail = `${initialDetail}\n\nThe runtime already emits thinking chunks. I will preserve their identity and settle them with the turn.`;

function ReasoningHarness({ detail }: { detail?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const entries: WorkLogEntry[] = detail
    ? [
        {
          id: "provider-reasoning:thread:thought",
          createdAt: "2026-10-24T03:00:00Z",
          activityKind: "task.progress",
          label: "Reasoning trace",
          toolCallId: "thought",
          detail,
          tone: "tool",
        },
      ]
    : [];
  const state = deriveAgentActivityTimelineState(entries);
  const opened = openId ? state.detailById.get(openId) : undefined;
  return (
    <div
      className="dark bg-background text-foreground"
      style={{ width: 840, height: 380, padding: 24 }}
    >
      {opened ? (
        <AgentActivityDetailView
          detail={opened}
          chatFontSizePx={15}
          markdownCwd={undefined}
          onBack={() => setOpenId(null)}
          onImageExpand={() => {}}
          timestampFormat="24-hour"
        />
      ) : (
        <>
          {state.timelineWorkEntries.map((entry) => (
            <TimelineWorkEntryRow
              key={entry.id}
              workEntry={entry}
              chatMetaFontSizePx={12}
              textFontSizePx={15}
              density="compact"
              onOpenAgentActivity={setOpenId}
              onImageExpand={() => {}}
              markdownCwd={undefined}
              timestampFormat="24-hour"
            />
          ))}
          <TimelineWorkEntryRow
            workEntry={{
              id: "read",
              createdAt: "2026-10-24T03:00:01Z",
              label: "Read provider adapter",
              tone: "tool",
            }}
            chatMetaFontSizePx={12}
            textFontSizePx={15}
            density="compact"
            onImageExpand={() => {}}
            markdownCwd={undefined}
            timestampFormat="24-hour"
          />
        </>
      )}
    </div>
  );
}

it("updates one reasoning row and opens its full detail", async () => {
  await page.viewport(900, 420);
  const screen = await render(<ReasoningHarness />);
  try {
    await expect.element(page.getByText("Read provider adapter")).toBeInTheDocument();
    await page.screenshot({ path: "__screenshots__/agent-thinking-before.png" });
    await screen.rerender(<ReasoningHarness detail={initialDetail} />);
    await expect.element(page.getByText(initialDetail)).toBeInTheDocument();
    await page.screenshot({ path: "__screenshots__/agent-thinking-after.png" });
    await screen.rerender(<ReasoningHarness detail={finalDetail} />);
    const row = page.getByRole("button", { name: /The runtime already emits thinking chunks/ });
    await expect.element(row).toBeInTheDocument();
    expect(row.elements()).toHaveLength(1);
    await row.click();
    await expect.element(page.getByRole("heading", { name: "Reasoning" })).toBeInTheDocument();
    await expect.element(page.getByText(initialDetail, { exact: true })).toBeInTheDocument();
    await page.screenshot({ path: "__screenshots__/agent-thinking-detail.png" });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect.element(page.getByText("Read provider adapter")).toBeInTheDocument();
  } finally {
    await screen.unmount();
  }
});
