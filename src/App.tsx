import Shell from './components/Shell'
import AdvisorView from './views/Advisor'
import AssortmentView from './views/Assortment'
import AuditView from './views/Audit'
import BranchesView from './views/Branches'
import CompetitorsView from './views/Competitors'
import CustomersView from './views/Customers'
import ExecutiveView from './views/Executive'
import InventoryView from './views/Inventory'
import ManagerView from './views/Manager'
import SellersView from './views/Sellers'
import SettingsView from './views/Settings'
import { useStore } from './store'

export default function App() {
  const { view } = useStore()
  return (
    <Shell>
      {view === 'executive' && <ExecutiveView />}
      {view === 'branches' && <BranchesView />}
      {view === 'sellers' && <SellersView />}
      {view === 'manager' && <ManagerView />}
      {view === 'assortment' && <AssortmentView />}
      {view === 'customers' && <CustomersView />}
      {view === 'inventory' && <InventoryView />}
      {view === 'advisor' && <AdvisorView />}
      {view === 'competitors' && <CompetitorsView />}
      {view === 'audit' && <AuditView />}
      {view === 'settings' && <SettingsView />}
    </Shell>
  )
}
