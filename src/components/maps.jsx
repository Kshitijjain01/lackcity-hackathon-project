import { useLocation } from 'react-router-dom'
import TriageMapRouter from './TriageMapRouter'

export default function Maps() {
    // Get triage result passed via navigation state
    const location = useLocation()
    const triageResult = location.state?.triageResult

    return <TriageMapRouter triageResult={triageResult} />
}