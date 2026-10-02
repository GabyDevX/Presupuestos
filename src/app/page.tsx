import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import { crearSeed } from "@/lib/seed";
import { leer } from "@/lib/store";
import Presupuestos from "@/components/Presupuestos";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await estaAutenticado())) redirect("/login");
  const inicial = (await leer()) ?? crearSeed();
  return <Presupuestos inicial={inicial} />;
}
