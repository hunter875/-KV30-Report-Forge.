import { useReportStore } from './store'

export const useReport = () => {
  const { currentReport, version, setCurrentReport, setVersion } = useReportStore()

  return {
    report: currentReport,
    version,
    setReport: setCurrentReport,
    setVersion,
  }
}
