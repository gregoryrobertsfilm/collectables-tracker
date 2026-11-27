import { useCallback, useEffect, useState } from 'react'
import { computeStats, type Snapshot, type Stats } from '../lib/inventory/stats'
import { supabase } from '../lib/supabase'
import { fetchSnapshot } from './inventory'

export type SnapshotState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: Snapshot; stats: Stats; isEmpty: boolean }

/** Loads the at-a-glance numbers from the database, with a way to load them again. */
export function useSnapshot(): { state: SnapshotState; reload: () => void } {
  const [state, setState] = useState<SnapshotState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let active = true
    fetchSnapshot(supabase)
      .then((snapshot) => {
        if (!active) return
        setState({
          status: 'ready',
          snapshot,
          stats: computeStats(snapshot),
          isEmpty: snapshot.releases.length === 0 && snapshot.copies.length === 0,
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({ status: 'error', message: error instanceof Error ? error.message : 'Could not load your data.' })
      })
    return () => {
      active = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])
  return { state, reload }
}
