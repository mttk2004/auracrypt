
// Listen for messages from the Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FILL_CREDENTIALS") {
    const { username, password } = request;
    const success = fillLoginForm(username, password);
    sendResponse({ success });
  }
});

function fillLoginForm(username, password) {
  // 1. Find Password Input
  const passwordInput = document.querySelector('input[type="password"]');
  if (!passwordInput) {
    console.warn("AuraCrypt: No password field found.");
    return false;
  }

  // 2. Find Username Input (usually the input immediately preceding the password field)
  // We search backwards from the password field
  let usernameInput = null;
  const allInputs = Array.from(document.querySelectorAll('input'));
  const passIdx = allInputs.indexOf(passwordInput);
  
  if (passIdx > 0) {
      // Check the input right before
      const prev = allInputs[passIdx - 1];
      if (prev.type === 'text' || prev.type === 'email' || prev.type === 'tel') {
          usernameInput = prev;
      }
  }

  // Fallback: Look for generic email/username fields if logic above failed
  if (!usernameInput) {
      usernameInput = document.querySelector('input[type="email"], input[name*="user"], input[id*="user"]');
  }

  // 3. Fill Values & Dispatch Events
  // (React/Angular/Vue require 'input' and 'change' events to register state changes)
  const setNativeValue = (element, value) => {
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
      
      if (valueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
      } else {
          valueSetter.call(element, value);
      }
      
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  if (passwordInput && password) {
      setNativeValue(passwordInput, password);
  }

  if (usernameInput && username) {
      setNativeValue(usernameInput, username);
  }

  return true;
}
