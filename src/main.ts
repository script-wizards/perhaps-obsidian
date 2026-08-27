import {
  createRng,
  parseBlock,
  parseMarkdown,
  Roller,
} from "@scriptwizards/perhaps-engine";
import type {
  Node as PerhapsNode,
  PerhapsTable,
  RollResult,
} from "@scriptwizards/perhaps-engine";
import {
  FuzzySuggestModal,
  Modal,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
} from "obsidian";

export default class PerhapsPlugin extends Plugin {
  private index = new Map<string, PerhapsTable[]>();

  async onload(): Promise<void> {
    this.app.workspace.onLayoutReady(() => void this.buildIndex());

    this.registerEvent(this.app.vault.on("create", (f) => void this.reindex(f)));
    this.registerEvent(this.app.vault.on("modify", (f) => void this.reindex(f)));
    this.registerEvent(this.app.vault.on("delete", (f) => this.index.delete(f.path)));
    this.registerEvent(
      this.app.vault.on("rename", (f, oldPath) => {
        this.index.delete(oldPath);
        void this.reindex(f);
      }),
    );

    this.addCommand({
      id: "roll-table",
      name: "Roll a table",
      callback: () => {
        new TablePicker(this, (table) => {
          new RollModal(this, table).open();
        }).open();
      },
    });

    this.addCommand({
      id: "insert-roll",
      name: "Roll a table into the note",
      editorCallback: (editor) => {
        new TablePicker(this, (table) => {
          const result = this.createRoller().roll(table);
          editor.replaceSelection(result.text);
        }).open();
      },
    });

    const renderBlock = (source: string, el: HTMLElement, ctx: { sourcePath: string }) =>
      this.renderBlock(source, el, ctx.sourcePath);
    this.registerMarkdownCodeBlockProcessor("perhaps", renderBlock);
    this.registerMarkdownCodeBlockProcessor("perchance", renderBlock);
  }

  allTables(): PerhapsTable[] {
    return [...this.index.values()].flat();
  }

  createRoller(extra?: PerhapsTable): Roller {
    const tables = this.allTables();
    if (extra) tables.push(extra);
    return new Roller(tables, createRng());
  }

  private async buildIndex(): Promise<void> {
    for (const file of this.app.vault.getMarkdownFiles()) {
      await this.indexFile(file);
    }
  }

  private async reindex(file: TAbstractFile): Promise<void> {
    if (file instanceof TFile && file.extension === "md") {
      await this.indexFile(file);
    }
  }

  private async indexFile(file: TFile): Promise<void> {
    const content = await this.app.vault.cachedRead(file);
    const tables = parseMarkdown(content, file.path);
    if (tables.length > 0) {
      this.index.set(file.path, tables);
    } else {
      this.index.delete(file.path);
    }
  }

  private renderBlock(source: string, el: HTMLElement, sourcePath: string): void {
    const { table, errors } = parseBlock(source, { path: sourcePath });
    const box = el.createDiv({ cls: "perhaps-block" });
    if (!table) {
      box.createDiv({ cls: "perhaps-error", text: `perhaps: ${errors.join("; ")}` });
      return;
    }

    const header = box.createDiv({ cls: "perhaps-header" });
    header.createSpan({ cls: "perhaps-title", text: table.title });
    const rollButton = header.createEl("button", { cls: "perhaps-roll-button", text: "roll" });
    const output = box.createDiv({ cls: "perhaps-output" });

    let roller = this.createRoller(table);
    let result: RollResult | null = null;

    const update = (next: RollResult) => {
      result = next;
      output.empty();
      const line = output.createDiv({ cls: "perhaps-result" });
      renderNodes(line, next.root.parts, [], (path) => update(roller.reroll(result!, path)));
      renderErrors(output, next.errors);
      const copy = output.createEl("button", { cls: "perhaps-copy-button", text: "copy" });
      copy.addEventListener("click", () => void copyText(next.text));
    };

    rollButton.addEventListener("click", () => {
      roller = this.createRoller(table);
      update(roller.roll(table));
    });
  }
}

class TablePicker extends FuzzySuggestModal<PerhapsTable> {
  constructor(
    private plugin: PerhapsPlugin,
    private onPick: (table: PerhapsTable) => void,
  ) {
    super(plugin.app);
    this.setPlaceholder("Roll a table...");
  }

  getItems(): PerhapsTable[] {
    return this.plugin.allTables();
  }

  getItemText(table: PerhapsTable): string {
    return `${table.title} (${table.source?.path ?? ""})`;
  }

  onChooseItem(table: PerhapsTable): void {
    this.onPick(table);
  }
}

class RollModal extends Modal {
  private roller: Roller;
  private result: RollResult;

  constructor(
    private plugin: PerhapsPlugin,
    private table: PerhapsTable,
  ) {
    super(plugin.app);
    this.roller = plugin.createRoller();
    this.result = this.roller.roll(table);
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { cls: "perhaps-title", text: this.table.title });

    const line = contentEl.createDiv({ cls: "perhaps-result perhaps-modal-result" });
    renderNodes(line, this.result.root.parts, [], (path) => {
      this.result = this.roller.reroll(this.result, path);
      this.render();
    });
    renderErrors(contentEl, this.result.errors);

    const buttons = contentEl.createDiv({ cls: "perhaps-buttons" });
    const again = buttons.createEl("button", { text: "roll again" });
    again.addEventListener("click", () => {
      this.result = this.roller.roll(this.table);
      this.render();
    });
    const copy = buttons.createEl("button", { text: "copy" });
    copy.addEventListener("click", () => void copyText(this.result.text));

    const hint = contentEl.createDiv({ cls: "perhaps-hint" });
    hint.setText("click any underlined part to reroll just that part");
  }
}

function renderNodes(
  parent: HTMLElement,
  nodes: PerhapsNode[],
  path: number[],
  onReroll: (path: number[]) => void,
): void {
  nodes.forEach((node, i) => {
    if (node.kind === "text") {
      parent.appendText(node.text);
      return;
    }
    const span = parent.createSpan({
      cls: `perhaps-node perhaps-${node.kind}`,
      attr: { title: `reroll ${node.source}` },
    });
    span.addEventListener("click", (event) => {
      event.stopPropagation();
      onReroll([...path, i]);
    });
    renderNodes(span, node.parts, [...path, i], onReroll);
  });
}

function renderErrors(parent: HTMLElement, errors: string[]): void {
  if (errors.length === 0) return;
  parent.createDiv({ cls: "perhaps-error", text: errors.join("; ") });
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  new Notice("copied");
}
