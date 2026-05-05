import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { PantryItems } from "./pages/PantryItems";
import { AddPantryItem } from "./pages/AddPantryItem";
import { Categories } from "./pages/Categories";
import { RecallAlerts } from "./pages/RecallAlerts";
import { RecallSearch } from "./pages/RecallSearch";
import { Users } from "./pages/Users";

import { ScopeUserProvider } from "./context/ScopeUserContext";

// Top-level routing. ScopeUserProvider exposes the active user to every page.
export default function App() {
  return (
    <ScopeUserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pantry" element={<PantryItems />} />
            <Route path="pantry/new" element={<AddPantryItem />} />
            <Route path="categories" element={<Categories />} />
            <Route path="alerts" element={<RecallAlerts />} />
            <Route path="recall-search" element={<RecallSearch />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ScopeUserProvider>
  );
}
