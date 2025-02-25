const { Plugin, PluginSettingTab, Setting, TFile, TextComponent, FuzzySuggestModal, Notice } = require('obsidian');

class HomepageQuickSettings {
    constructor() {
        this.homepagePath = "";
    }
}

class FileSuggestModal extends FuzzySuggestModal {
    constructor(app, onSelect) {
        super(app);
        this.onSelect = onSelect;
    }

    getItems() {
        return this.app.vault.getFiles().map(file => file.path);
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onSelect(item);
    }
}

class HomepageQuickSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl)
            .setName('Homepage file')
            .setDesc('Enter file path manually or select from suggestions')
            .addText(text => {
                text.setPlaceholder('Enter file path (e.g., Folder/HomePage.md)')
                    .setValue(this.plugin.settings.homepagePath)
                    .onChange(async (value) => {
                        this.plugin.settings.homepagePath = value;
                        await this.plugin.saveSettings();
                    });
                const button = text.inputEl.parentElement.createEl("button", { text: "🔍" });
                button.addEventListener("click", () => {
                    new FileSuggestModal(this.app, (selectedPath) => {
                        text.setValue(selectedPath);
                        this.plugin.settings.homepagePath = selectedPath;
                        this.plugin.saveSettings();
                    }).open();
                });
            });
    }
}

module.exports = class HomepageQuickPlugin extends Plugin {
    async onload() {
        this.settings = new HomepageQuickSettings();
        await this.loadSettings();
        this.addSettingTab(new HomepageQuickSettingTab(this.app, this));
        this.addCommand({
            id: 'open-homepage',
            name: 'Open Homepage',
            callback: () => this.forceHomepage(),
        });
        this.registerEvent(
            this.app.workspace.on("layout-ready", async () => {
                await this.forceHomepage(true);
            })
        );
    }

    async loadSettings() {
        this.settings = Object.assign(new HomepageQuickSettings(), await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async forceHomepage(isInitialLoad = false) {
        console.log("Homepage Quick: Forcing homepage");
        const filePath = this.settings.homepagePath;
        if (!filePath) {
            console.log("Homepage Quick: No homepage path specified");
            new Notice("Homepage Quick: No homepage path specified. Please set a homepage in settings.");
            return;
        }
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) {
            console.warn(`Homepage Quick: File "${filePath}" not found or path is incorrect.`);
            new Notice(`Homepage Quick: File "${filePath}" not found or path is incorrect.`);
            return;
        }
        if (isInitialLoad) {
            const leaves = this.app.workspace.getLeavesOfType("markdown");
            console.log("Homepage Quick: Closing", leaves.length, "open tabs");
            for (const leaf of leaves) {
                await leaf.detach();
            }
        }
        const leaf = this.app.workspace.getLeaf(true);
        console.log("Homepage Quick: Opening homepage file:", filePath);
        await leaf.openFile(file, { active: true });
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
    }
};
