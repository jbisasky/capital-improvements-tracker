import { type ReactElement } from "react";
import { RouterProvider } from "react-router";
import { router } from "@/app/router";

function App(): ReactElement {
  return <RouterProvider router={router} />;
}

export default App;
