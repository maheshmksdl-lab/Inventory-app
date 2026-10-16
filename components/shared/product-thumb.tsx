import Image from "next/image";
import type { Icon } from "@phosphor-icons/react";
import {
  ArmchairIcon,
  BatteryChargingIcon,
  CubeIcon,
  DeskIcon,
  HardDrivesIcon,
  HeadphonesIcon,
  KeyboardIcon,
  LampIcon,
  LaptopIcon,
  MonitorIcon,
  MouseIcon,
  NetworkIcon,
  PrinterIcon,
  SpeakerHifiIcon,
  UsbIcon,
  WebcamIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ProductIconKey } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

const ICONS: Record<ProductIconKey, Icon> = {
  headphones: HeadphonesIcon,
  keyboard: KeyboardIcon,
  mouse: MouseIcon,
  monitor: MonitorIcon,
  printer: PrinterIcon,
  usb: UsbIcon,
  chair: ArmchairIcon,
  network: NetworkIcon,
  storage: HardDrivesIcon,
  webcam: WebcamIcon,
  speaker: SpeakerHifiIcon,
  power: BatteryChargingIcon,
  laptop: LaptopIcon,
  lamp: LampIcon,
  desk: DeskIcon,
  box: CubeIcon,
};

/** Square product thumbnail: its photo, or a category glyph on a light tile when it has none. */
export function ProductThumb({ icon, src, size = 36, className }: { icon: ProductIconKey; src?: string; size?: number; className?: string }) {
  if (src) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-lg border border-line-soft bg-[#F5F6F8]", className)} style={{ width: size, height: size }} aria-hidden>
        <Image src={src} alt="" fill sizes={`${size * 2}px`} className="object-cover" />
      </span>
    );
  }
  const IconCmp = ICONS[icon] ?? CubeIcon;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-lg border border-line-soft bg-[#F5F6F8] text-[#475467]", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <IconCmp size={Math.round(size * 0.5)} weight="duotone" />
    </span>
  );
}
