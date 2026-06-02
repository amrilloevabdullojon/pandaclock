import * as React from "react";
import { Animated, Easing, Linking, Pressable, Text, View } from "react-native";
import { Compass, MapPin, MapPinOff, Navigation2, Settings } from "lucide-react-native";
import { Card } from "@/components/ui";
import {
  bearingDegrees,
  distanceMeters,
  formatDistance,
  useCurrentLocation,
} from "@/lib/use-current-location";

export interface OfficeGeofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface Props {
  /**
   * Все офисы компании из /time/today. Пустой массив → geofence не настроен.
   * Карточка находит ближайший по distance и показывает status относительно него.
   */
  offices: OfficeGeofence[];
  /** Если true — карточка показана компактнее (для WORKING/ON_BREAK состояний). */
  compact?: boolean;
}

/**
 * Большая карточка локации над/под кнопкой start-day.
 *
 * Показывает одно из 5 состояний (по приоритету):
 *  1. permission != granted → серая, CTA «Разрешить геолокацию»
 *  2. office === null → серая, «Геофенс не настроен — спросите HR»
 *  3. coords === null → серая, «Определяем местоположение…»
 *  4. distance ≤ radius → зелёная, «Вы в офисе», pulse-индикатор
 *  5. distance > radius → жёлтая, «Вне зоны (340 м)» + компас в сторону офиса
 *
 * Все расчёты локально через haversine. Сервер шлёт office.coords один раз,
 * клиент пересчитывает distance каждые 30 сек (frequency хука useCurrentLocation).
 */
export function LocationCard({ offices, compact = false }: Props) {
  const { coords, permission, requestPermission } = useCurrentLocation();

  // Находим ближайший офис, если есть координаты и хотя бы один офис.
  const nearest = React.useMemo(() => {
    if (!coords || offices.length === 0) return null;
    let best: { office: OfficeGeofence; meters: number } | null = null;
    for (const office of offices) {
      const meters = distanceMeters(coords, office);
      if (!best || meters < best.meters) {
        best = { office, meters };
      }
    }
    return best;
  }, [coords, offices]);

  // ===== Состояние 1: нет разрешения =====
  if (permission === "denied" || permission === "unknown") {
    return (
      <Card padding={compact ? "sm" : "lg"} className="border-border border">
        <View className="flex-row items-start gap-3">
          <IconCircle color="muted">
            <MapPinOff size={compact ? 18 : 22} color="#9CA0B0" />
          </IconCircle>
          <View className="flex-1">
            <Text className="text-foreground text-base font-bold">Геолокация выключена</Text>
            <Text className="text-muted-foreground mt-1 text-xs">
              Без неё HR не сможет подтвердить, что вы в офисе.
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={requestPermission}
                accessibilityRole="button"
                accessibilityLabel="Разрешить геолокацию"
                className="bg-primary-500 rounded-md px-3 py-2 active:opacity-80"
              >
                <Text className="text-xs font-bold text-white">Разрешить</Text>
              </Pressable>
              <Pressable
                onPress={() => void Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Открыть настройки"
                className="border-border flex-row items-center gap-1 rounded-md border px-3 py-2 active:opacity-70"
              >
                <Settings size={12} color="#6B7080" />
                <Text className="text-muted-foreground text-xs font-bold">Настройки</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Card>
    );
  }

  // ===== Состояние 2: geofence не настроен =====
  if (offices.length === 0) {
    return (
      <Card padding={compact ? "sm" : "lg"} className="border-border border">
        <View className="flex-row items-center gap-3">
          <IconCircle color="muted">
            <MapPin size={compact ? 18 : 22} color="#9CA0B0" />
          </IconCircle>
          <View className="flex-1">
            <Text className="text-foreground text-sm font-bold">Гео-фенс не настроен</Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              Можете отмечаться из любой точки.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  // ===== Состояние 3: ждём координаты =====
  if (!coords) {
    return (
      <Card padding={compact ? "sm" : "lg"} className="border-border border">
        <View className="flex-row items-center gap-3">
          <IconCircle color="muted">
            <MapPin size={compact ? 18 : 22} color="#9CA0B0" />
          </IconCircle>
          <View className="flex-1">
            <Text className="text-foreground text-sm font-bold">Определяем местоположение…</Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">Это занимает 5-10 секунд.</Text>
          </View>
        </View>
      </Card>
    );
  }

  // ===== Состояние 4/5: считаем relative к ближайшему офису =====
  if (!nearest) return null; // невозможный кейс при coords + offices.length > 0
  const { office, meters } = nearest;
  const inside = meters <= office.radius;
  const officeCountSuffix = offices.length > 1 ? ` · из ${offices.length} офисов` : "";

  if (inside) {
    return (
      <Card
        padding={compact ? "sm" : "lg"}
        className="border-success/40 bg-success-light/30 border"
      >
        <View className="flex-row items-center gap-3">
          <PulseIcon color="#22C55E">
            <MapPin size={compact ? 18 : 22} color="#FFFFFF" fill="#22C55E" />
          </PulseIcon>
          <View className="flex-1">
            <Text className="text-foreground text-base font-bold">Вы в офисе · {office.name}</Text>
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {formatDistance(meters)} от центра · точность ±
              {coords.accuracy ? Math.round(coords.accuracy) : "—"} м{officeCountSuffix}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  // Outside: показываем расстояние до ближайшего + компас в его сторону
  const bearing = bearingDegrees(coords, office);
  return (
    <Card padding={compact ? "sm" : "lg"} className="border-warning/40 bg-warning-light/30 border">
      <View className="flex-row items-center gap-3">
        <IconCircle color="warning">
          <MapPin size={compact ? 18 : 22} color="#FFFFFF" fill="#F59E0B" />
        </IconCircle>
        <View className="flex-1">
          <Text className="text-foreground text-base font-bold">
            Вне зоны · {formatDistance(meters)}
          </Text>
          <Text className="text-muted-foreground mt-0.5 text-xs">
            до ближайшего «{office.name}» · радиус {office.radius} м{officeCountSuffix}
          </Text>
        </View>
        <View
          className="bg-warning/20 h-9 w-9 items-center justify-center rounded-full"
          accessibilityLabel={`Офис в направлении ${Math.round(bearing)}°`}
        >
          <View style={{ transform: [{ rotate: `${bearing}deg` }] }}>
            <Navigation2 size={16} color="#C7762A" fill="#C7762A" />
          </View>
        </View>
      </View>
    </Card>
  );
}

function IconCircle({
  color,
  children,
}: {
  color: "muted" | "warning" | "success";
  children: React.ReactNode;
}) {
  const map = {
    muted: "bg-muted",
    warning: "bg-warning",
    success: "bg-success",
  } as const;
  return (
    <View className={`h-10 w-10 items-center justify-center rounded-full ${map[color]}`}>
      {children}
    </View>
  );
}

/**
 * Кружок с непрерывным «дыхательным» pulse — используется для «вы в офисе»,
 * чтобы карточка не была статичной. Анимация чистая JS-only (Animated.Value),
 * не нужен useNativeDriver и Reanimated.
 */
function PulseIcon({ color, children }: { color: string; children: React.ReactNode }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.6,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View className="h-10 w-10 items-center justify-center">
      {/* Пульсирующий ореол */}
      <Animated.View
        style={{
          position: "absolute",
          height: 40,
          width: 40,
          borderRadius: 20,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        }}
      />
      {/* Сам круг */}
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        {children}
        <Compass size={0} color="transparent" />
      </View>
    </View>
  );
}
