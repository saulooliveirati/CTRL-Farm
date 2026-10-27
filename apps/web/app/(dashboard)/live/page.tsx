import { LiveCameraManager } from "@/components/cameras/live-camera-manager";
import { getCamerasForPage } from "@/lib/server-cameras";

export const metadata = {
  title: "Monitoramento | CTRL+Farm",
  description: "Monitoramento ao vivo de câmeras e transmissões de impressoras 3D",
};

export default async function LivePage() {
  const { cameras, error } = await getCamerasForPage();
  return <LiveCameraManager initialCameras={cameras} initialError={error} />;
}
