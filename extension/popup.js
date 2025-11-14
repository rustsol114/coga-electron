/**
 * popup.js
 * Handles popup UI and password authentication
 */

(function() {
  'use strict';

  const PASSWORD_HASH_KEY = 'coga_password_hash';
  const UNLOCKED_KEY = 'coga_unlocked';

  // DOM elements
  const unlockForm = document.getElementById('unlock-form');
  const lockedStatus = document.getElementById('locked-status');
  const unlockedStatus = document.getElementById('unlocked-status');
  const passwordInput = document.getElementById('password-input');
  const unlockBtn = document.getElementById('unlock-btn');
  const showUnlockBtn = document.getElementById('show-unlock-btn');
  const lockBtn = document.getElementById('lock-btn');
  const statusMessage = document.getElementById('status-message');

  // Initialize popup
  init();

  /**
   * Initialize popup state
   */
  function init() {
    checkUnlockStatus();
    
    // Event listeners
    showUnlockBtn.addEventListener('click', () => {
      lockedStatus.style.display = 'none';
      unlockForm.classList.add('active');
      passwordInput.focus();
    });

    unlockBtn.addEventListener('click', handleUnlock);
    lockBtn.addEventListener('click', handleLock);

    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleUnlock();
      }
    });
  }

  /**
   * Check current unlock status
   */
  function checkUnlockStatus() {
    chrome.storage.local.get([UNLOCKED_KEY, PASSWORD_HASH_KEY], (result) => {
      const isUnlocked = result[UNLOCKED_KEY] === true;
      const hasPassword = !!result[PASSWORD_HASH_KEY];

      if (!hasPassword) {
        // First time - show setup
        showSetupForm();
      } else if (isUnlocked) {
        showUnlockedState();
      } else {
        showLockedState();
      }
    });
  }

  /**
   * Show setup form (first time)
   */
  function showSetupForm() {
    lockedStatus.style.display = 'none';
    unlockedStatus.classList.remove('active');
    unlockForm.classList.add('active');
    
    const label = document.querySelector('#unlock-form label');
    if (label) {
      label.textContent = 'Set Password (First Time)';
    }
    unlockBtn.textContent = 'Set Password';
  }

  /**
   * Show locked state
   */
  function showLockedState() {
    unlockForm.classList.remove('active');
    unlockedStatus.classList.remove('active');
    lockedStatus.style.display = 'block';
    passwordInput.value = '';
  }

  /**
   * Show unlocked state
   */
  function showUnlockedState() {
    unlockForm.classList.remove('active');
    lockedStatus.style.display = 'none';
    unlockedStatus.classList.add('active');
  }

  /**
   * Hash password (simple SHA-256)
   */
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Handle unlock attempt
   */
  async function handleUnlock() {
    const password = passwordInput.value.trim();

    if (!password) {
      showMessage('Please enter a password', 'error');
      return;
    }

    if (password.length < 4) {
      showMessage('Password must be at least 4 characters', 'error');
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      
      chrome.storage.local.get([PASSWORD_HASH_KEY], async (result) => {
        const storedHash = result[PASSWORD_HASH_KEY];

        if (!storedHash) {
          // First time - save password
          await chrome.storage.local.set({
            [PASSWORD_HASH_KEY]: passwordHash,
            [UNLOCKED_KEY]: true
          });
          
          // Notify background to unlock
          chrome.runtime.sendMessage({ action: 'unlock' }, () => {
            showMessage('Password set successfully! Extension unlocked.', 'success');
            setTimeout(() => {
              showUnlockedState();
              updateUnlockFormLabel();
            }, 1000);
          });
        } else if (storedHash === passwordHash) {
          // Password matches - unlock
          await chrome.storage.local.set({ [UNLOCKED_KEY]: true });
          
          // Notify background to unlock
          chrome.runtime.sendMessage({ action: 'unlock' }, () => {
            showMessage('Extension unlocked successfully!', 'success');
            setTimeout(() => {
              showUnlockedState();
            }, 1000);
          });
        } else {
          // Wrong password
          showMessage('Incorrect password', 'error');
          passwordInput.value = '';
          passwordInput.focus();
        }
      });
    } catch (error) {
      console.error('[COGA] Error unlocking:', error);
      showMessage('Error processing password', 'error');
    }
  }

  /**
   * Handle lock
   */
  async function handleLock() {
    await chrome.storage.local.set({ [UNLOCKED_KEY]: false });
    
    chrome.runtime.sendMessage({ action: 'lock' }, () => {
      showLockedState();
      showMessage('Extension locked', 'success');
      setTimeout(() => {
        hideMessage();
      }, 2000);
    });
  }

  /**
   * Update unlock form label
   */
  function updateUnlockFormLabel() {
    const label = document.querySelector('#unlock-form label');
    if (label) {
      label.textContent = 'Enter Password';
    }
    unlockBtn.textContent = 'Unlock Extension';
  }

  /**
   * Show status message
   */
  function showMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message active ${type}`;
  }

  /**
   * Hide status message
   */
  function hideMessage() {
    statusMessage.classList.remove('active');
  }
})();

