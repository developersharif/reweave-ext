// Spike only: the test sets { mode, css } through chrome.storage.local.
chrome.runtime.onInstalled.addListener(() => chrome.storage.local.set({ mode: 'none', css: '' }));
