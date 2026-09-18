import { Routes, Route ,} from 'react-router-dom'
import Login from './components/pages/login/login' 
import Register from "./components/pages/Register/Register"
import Home from "./components/pages/Home/home"
import Exhibitions from "./components/pages/Exhibitions/Exhibitions"
import ExhibitionDetail from "./components/pages/ExhibitionDetail/ExhibitionDetail"
import ManageAccount from './components/pages/ManageAccount/ManageAccount'
import AdminDashboard from './components/pages/AdminDashboard/AdminDashboard'
import AddArtist from './components/pages/AddArtist/AddArtist'
import CreateExhibition from './components/pages/Createexhibition/Createexhibition'
import { ProtectedRoute } from './components/domain/ProtectedRoute/ProtectedRoute'
import ChangePassword from './components/pages/ChangePassword/ChangePassword'
import CreatePerformance from './components/pages/CreatePerformance/CreatePerformance'
import Performances from './components/pages/Performances/Performances'
import Artists from './components/pages/Artists/Artists'
import KidsCorner from './components/pages/KidsCorner/KidsCorner'
 


import './App.css'

export default function App() {
  

  return (
    <Routes> 
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/exhibitions" element={<Exhibitions />} />
        <Route path="/exhibitions/:id" element={<ExhibitionDetail />} />
        <Route path="/manage-account" element={<ManageAccount />} />
        <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/performances" element={<Performances />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/kids-corner" element={<KidsCorner />} />
        
        

        <Route
  path="/admin-dashboard"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/add-artist"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AddArtist />
    </ProtectedRoute>
  }
/>
<Route
  path="/create-exhibition"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <CreateExhibition />
    </ProtectedRoute>
  }
/>

<Route
  path="/create-performance"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <CreatePerformance />
    </ProtectedRoute>
  }
/>
    </Routes>  
  );
      
}

