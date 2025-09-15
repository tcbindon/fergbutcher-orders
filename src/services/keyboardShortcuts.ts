interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
}

class KeyboardShortcutsService {
  private shortcuts: Map<string, ShortcutAction> = new Map();
  private isEnabled = true;

  constructor() {
    this.bindEventListener();
  }

  // Register a keyboard shortcut
  register(shortcut: ShortcutAction) {
    const key = this.createShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  // Unregister a keyboard shortcut
  unregister(shortcut: Omit<ShortcutAction, 'description' | 'action'>) {
    const key = this.createShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  // Get all registered shortcuts
  getShortcuts(): ShortcutAction[] {
    return Array.from(this.shortcuts.values());
  }

  // Enable/disable shortcuts
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Create a unique key for the shortcut
  private createShortcutKey(shortcut: Omit<ShortcutAction, 'description' | 'action'>): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('ctrl');
    if (shortcut.altKey) modifiers.push('alt');
    if (shortcut.shiftKey) modifiers.push('shift');
    
    return `${modifiers.join('+')}-${shortcut.key.toLowerCase()}`;
  }

  // Handle keyboard events
  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.isEnabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    const shortcutKey = this.createShortcutKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey
    });

    const shortcut = this.shortcuts.get(shortcutKey);
    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  };

  // Bind the event listener
  private bindEventListener() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  // Cleanup method
  cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }

  // Format shortcut for display
  static formatShortcut(shortcut: Omit<ShortcutAction, 'description' | 'action'>): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  }
}

export const keyboardShortcuts = new KeyboardShortcutsService();
export default keyboardShortcuts;

export { KeyboardShortcutsService }