import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { getDocumentTitle } from './domain/title'
import { startClock } from './store/clock'
import { appStore } from './store/instance'

function updateTitle(now: number) {
  document.title = getDocumentTitle(appStore.getState().data, now)
}

startClock(updateTitle)
// Without waiting for the next tick, so starting or pausing a timer shows up in the title right away.
appStore.subscribe(() => updateTitle(Date.now()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
