import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { draftApi } from '../api/draftApi'
import { useDraftAction } from './useDrafting'
import { useUnsavedInput } from './useUnsavedInput'
import { draftKeys } from '../api/queryKeys'
import {
  normalizeInput,
  validateInputIssues,
  type InputIssue,
} from '../utils/validation'
import { useDraftPresentation } from './useDraftPresentation'
import type {
  InputValues,
  Snapshot,
  TemplateVersion,
  Workspace,
} from '../types'

export function useDraftInput(
  workspace: Workspace,
  template: TemplateVersion,
  source?: Snapshot
) {
  const display = useDraftPresentation()
  const client = useQueryClient()
  const [input, setInput] = useState<InputValues>({
    ...(source?.input ?? workspace.input),
  })
  const [baseline, setBaseline] = useState(workspace.input)
  const [revision, setRevision] = useState(workspace.revision)
  const [savedAt, setSavedAt] = useState(workspace.savedAt)
  const [errors, setErrors] = useState<Record<string, InputIssue>>({})
  const [dialog, setDialog] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmed, setConfirmed] = useState<Snapshot | null>(null)
  const [remote, setRemote] = useState<Workspace | null>(null)
  const confirmKey = useRef(crypto.randomUUID())
  const generationKey = useRef(crypto.randomUUID())
  const dirty =
    JSON.stringify(normalizeInput(input, template.fields)) !==
    JSON.stringify(normalizeInput(baseline, template.fields))
  const save = useDraftAction((_: void, ctx) =>
    draftApi.save(workspace.id, input, revision, ctx)
  )
  const reload = useDraftAction((_: void, ctx) =>
    draftApi.workspace(workspace.id, ctx)
  )
  const confirm = useDraftAction(async (_: void, ctx) => {
    let snapshot = confirmed
    if (!snapshot) {
      snapshot = await draftApi.confirm(
        workspace.id,
        input,
        revision,
        confirmKey.current,
        ctx
      )
      setConfirmed(snapshot)
      setRevision((value) => value + 1)
      setBaseline({ ...input })
      setSavedAt(snapshot.confirmedAt)
      // Confirmation persists independently of generation, including a failed generation request.
      await client.invalidateQueries({
        queryKey: draftKeys.scope(ctx.scope, ctx.scenario),
      })
    }
    return draftApi.generate(
      workspace.id,
      snapshot.id,
      generationKey.current,
      ctx
    )
  })
  const busy = save.isPending || confirm.isPending || reload.isPending
  const guard = useUnsavedInput(dirty || busy)
  function setValue(fieldId: string, value: string) {
    setInput((old) => ({ ...old, [fieldId]: value }))
    setErrors((old) => {
      const next = { ...old }
      delete next[fieldId]
      return next
    })
    setConfirmed(null)
    confirmKey.current = crypto.randomUUID()
    generationKey.current = crypto.randomUUID()
    confirm.reset()
  }
  function openConfirm() {
    const issues = validateInputIssues(input, template.fields)
    setErrors(issues)
    if (Object.keys(issues).length) {
      document.getElementById(`draft-field-${Object.keys(issues)[0]}`)?.focus()
      return
    }
    setAcknowledged(false)
    setDialog(true)
  }
  async function saveInput() {
    try {
      const result = await save.mutateAsync(undefined)
      setRevision(result.revision)
      setBaseline(result.input)
      setSavedAt(result.savedAt)
      setRemote(null)
    } catch {
      /* Mutation exposes error and input remains editable. */
    }
  }
  async function compareSaved() {
    try {
      setRemote(await reload.mutateAsync(undefined))
    } catch {
      /* Inline error. */
    }
  }
  function keepLocalAgainstRemote() {
    if (!remote) return
    setRevision(remote.revision)
    setBaseline(remote.input)
    setSavedAt(remote.savedAt)
    setRemote(null)
    save.reset()
    confirm.reset()
  }
  return {
    input,
    setValue,
    dirty,
    errors: Object.fromEntries(
      Object.entries(errors).map(([id, issue]) => [id, display.issue(issue)])
    ),
    busy,
    save,
    saveInput,
    compareSaved,
    keepLocalAgainstRemote,
    remote,
    reload,
    revision,
    savedAt,
    dialog,
    setDialog,
    acknowledged,
    setAcknowledged,
    confirmed,
    confirm,
    openConfirm,
    guard,
  }
}
