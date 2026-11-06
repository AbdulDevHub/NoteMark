import './assets/main.css'

import { Provider } from 'jotai'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { appStore } from './store/atoms'

// Lets CSS adapt to the platform (e.g. macOS vibrancy behind the sidebar).
document.documentElement.dataset.platform = navigator.userAgent.includes('Mac')
  ? 'darwin'
  : navigator.userAgent.includes('Windows')
    ? 'win32'
    : 'linux'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={appStore}>
      <App />
    </Provider>
  </React.StrictMode>
)
