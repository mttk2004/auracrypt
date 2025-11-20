
// Listen for messages from the Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FILL_CREDENTIALS") {
    const { username, password } = request;
    const success = fillLoginForm(username, password);
    sendResponse({ success });
  }
});

/**
 * Robust Auto-fill logic designed to work with modern frameworks (React, Vue, Angular)
 * and standard HTML forms.
 */
function fillLoginForm(username, password) {
  // 1. Find Password Input
  // Priority: autocomplete="current-password" -> type="password"
  let passwordInput = document.querySelector('input[autocomplete="current-password"]');
  if (!passwordInput) {
    passwordInput = document.querySelector('input[type="password"]');
  }

  if (!passwordInput) {
    console.warn("AuraCrypt: No password field found.");
    return false;
  }

  // 2. Find Username Input
  // Priority: autocomplete="username" -> preceding input -> type="email" -> generic heuristics
  let usernameInput = document.querySelector('input[autocomplete="username"], input[autocomplete="email"]');
  
  if (!usernameInput) {
      // Search backwards from password field in the DOM
      const allInputs = Array.from(document.querySelectorAll('input'));
      const passIdx = allInputs.indexOf(passwordInput);
      
      if (passIdx > 0) {
          // Check the input right before (ignoring hidden or checkbox/radio)
          let searchIdx = passIdx - 1;
          while (searchIdx >= 0) {
              const prev = allInputs[searchIdx];
              const type = prev.type.toLowerCase();
              if (type !== 'hidden' && type !== 'submit' && type !== 'checkbox' && type !== 'radio') {
                  usernameInput = prev;
                  break;
              }
              searchIdx--;
          }
      }
  }

  if (!usernameInput) {
      // Fallback: Look for generic email/username fields
      usernameInput = document.querySelector('input[type="email"], input[name*="user"], input[id*="user"], input[name*="login"], input[id*="login"]');
  }

  // 3. Fill Values with React/Vue Bypass
  // Modern frameworks track value state internally. Setting .value directly doesn't always trigger updates.
  // We must call the native setter and dispatch events.
  const setNativeValue = (element, value) => {
      if (!value) return;

      // Focus first (helps with floating labels)
      element.focus();
      element.click();

      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
      
      if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
      } else {
          valueSetter.call(element, value);
      }
      
      element.value = value;
      
      // Dispatch a sequence of events to simulate real user typing
      const events = [
          new Event('input', { bubbles: true }),
          new Event('change', { bubbles: true }),
          new KeyboardEvent('keydown', { bubbles: true, key: 'a' }), // Dummy key events
          new KeyboardEvent('keyup', { bubbles: true, key: 'a' }),
          new Event('blur', { bubbles: true })
      ];

      events.forEach(event => element.dispatchEvent(event));
  };

  if (passwordInput && password) {
      setNativeValue(passwordInput, password);
  }

  if (usernameInput && username) {
      setNativeValue(usernameInput, username);
  }

  return true;
}
