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

/**
 * Neutral product image placeholder: the demo catalogue has no photos, so each
 * item shows a category glyph on a light tile. Swap for <Image> once products carry images.
 */
export function ProductThumb({ icon, size = 36, className }: { icon: ProductIconKey; size?: number; className?: string }) {
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
