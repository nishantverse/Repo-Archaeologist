import { useScanData } from '../hooks/useScanData'
import LoadingIndicator from './LoadingIndicator'
import ErrorMessage from './ErrorMessage'
import Header from './Header'
import EntrypointCard from './EntrypointCard'
import FlowDiagram from './FlowDiagram'
import TechDebtPanel from './TechDebtPanel'
import HumanSummaryCard from './HumanSummaryCard'
import SteeringPanel from './SteeringPanel'

const Dashboard = () => {
  const state = useScanData()

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f5f0e8] text-black">
        <LoadingIndicator />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-[#f5f0e8] text-black">
        <ErrorMessage message={state.message} />
      </div>
    )
  }

  const { data } = state

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-black">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="md:col-span-2">
            <Header
              repoName={data.repoName}
              scannedAt={data.scannedAt}
              tokensSavedPercentage={data.tokensSavedPercentage}
            />
          </div>
          <div className="col-span-1">
            <EntrypointCard
              entrypoint={data.entrypoint}
              inferredStack={data.inferredStack}
            />
          </div>
          <div className="col-span-1">
            <HumanSummaryCard humanSummary={data.humanSummary} />
          </div>
          <div className="md:col-span-2">
            <FlowDiagram flow={data.flow} />
          </div>
          <div className="md:col-span-2">
            <TechDebtPanel techDebt={data.techDebt} />
          </div>
          <div className="md:col-span-2">
            <SteeringPanel kiroSteering={data.kiroSteering} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
