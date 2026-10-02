import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import { listar } from "@/lib/presupuestos";
import Aplicacion from "@/components/Aplicacion";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await estaAutenticado())) redirect("/login");
  return <Aplicacion listaInicial={await listar()} />;
}
