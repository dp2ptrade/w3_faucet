// Fix for EventEmitter memory leak warnings from WalletConnect
// This must be imported before any WalletConnect modules

// Suppress the specific MaxListenersExceededWarning for WalletConnect
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning: any, type?: any) {
  // Suppress MaxListenersExceededWarning for pairing events
  if (type === 'MaxListenersExceededWarning' && 
      (warning.includes('pairing_create') || warning.includes('pairing_delete'))) {
    return;
  }
  return originalEmitWarning.call(this, warning, type);
};

// Also set EventEmitter max listeners as backup
const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50;

// Set for process if available
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(50);
}

// Export empty object to make this a module
export {};