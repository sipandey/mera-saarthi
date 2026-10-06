import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { C, styles } from '../theme';

type Translate = (key: string) => string;
type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

function placeLabel(feature: Feature) {
  const p = feature.properties ?? {};
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const locality = p.district || p.city;
  return [...new Set([p.name, street, locality, p.state, p.country].filter(Boolean))].join(', ');
}

export function LocationPicker({
  label,
  value,
  onChange,
  placeholder,
  t,
  hindi,
  allowCurrentLocation = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  t: Translate;
  hindi: boolean;
  allowCurrentLocation?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<Feature[]>([]);
  const [bias, setBias] = useState<[number, number] | null>(null);
  const requestId = useRef(0);
  const translateRef = useRef(t);
  translateRef.current = t;

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 3) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      setMessage('');
      try {
        const params = new URLSearchParams({ q: query, limit: '5', lang: hindi ? 'hi' : 'en', countrycode: 'IN' });
        if (bias) {
          params.set('lat', String(bias[1]));
          params.set('lon', String(bias[0]));
          params.set('zoom', '10');
        }
        const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
        if (!response.ok) throw new Error('Search unavailable');
        const data = await response.json() as { features?: Feature[] };
        if (requestId.current === id) {
          const matches = (data.features ?? []).filter((item) => placeLabel(item));
          setSuggestions(matches);
          if (!matches.length) setMessage(translateRef.current('locationNoResults'));
        }
      } catch {
        if (requestId.current === id) {
          setSuggestions([]);
          setMessage(translateRef.current('locationSearchFailed'));
        }
      } finally {
        if (requestId.current === id) setLoadingSuggestions(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (requestId.current === id) requestId.current += 1;
    };
  }, [value, focused, hindi, bias]);

  const useCurrentLocation = async () => {
    setGettingLocation(true);
    setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage(t('locationPermissionDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      setBias([longitude, latitude]);
      let address: string | undefined;
      try {
        const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), lang: hindi ? 'hi' : 'en' });
        const response = await fetch(`https://photon.komoot.io/reverse?${params.toString()}`);
        if (response.ok) {
          const data = await response.json() as { features?: Feature[] };
          address = data.features?.map(placeLabel).find(Boolean);
        }
      } catch {
        // Fall back to native reverse geocoding below
      }
      if (!address) {
        try {
          const nativePlaces = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (nativePlaces && nativePlaces.length > 0) {
            const p = nativePlaces[0];
            const street = [p.streetNumber, p.street].filter(Boolean).join(' ');
            const locality = p.district || p.subregion || p.city;
            address = [...new Set([p.name, street, locality, p.region, p.country].filter(Boolean))].join(', ');
          }
        } catch {
          // Both lookups failed
        }
      }
      if (address) {
        onChange(address);
        setFocused(false);
        setSuggestions([]);
      } else {
        setMessage(t('locationUnavailable'));
      }
    } catch {
      setMessage(t('locationUnavailable'));
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <View style={styles.locationWrap}>
      {!!label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={(text) => { onChange(text); setMessage(''); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        placeholderTextColor="#78716C"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      <Text style={styles.locationHelper}>{t('locationSearchHint')}</Text>
      {allowCurrentLocation && <Pressable accessibilityRole="button" disabled={gettingLocation} onPress={() => { void useCurrentLocation(); }} style={styles.locationButton}>
        {gettingLocation ? <ActivityIndicator size="small" color={C.orange} /> : <Text style={styles.locationButtonIcon}>⌖</Text>}
        <Text style={styles.locationButtonText}>{gettingLocation ? t('locationFinding') : t('useCurrentLocation')}</Text>
      </Pressable>}
      {focused && value.trim().length >= 3 && (loadingSuggestions || suggestions.length > 0 || !!message) ? (
        <View style={styles.locationSuggestions}>
          {loadingSuggestions && <View style={styles.locationHint}><ActivityIndicator size="small" color={C.orange} /><Text style={styles.locationHelper}>{t('locationSearching')}</Text></View>}
          {suggestions.map((feature, index) => {
            const title = placeLabel(feature);
            return <Pressable key={`${title}-${index}`} accessibilityRole="button" onPress={() => { onChange(title); setSuggestions([]); setFocused(false); }} style={styles.locationSuggestion}>
              <Text style={styles.locationSuggestionPin}>⌖</Text><Text style={styles.locationSuggestionText}>{title}</Text>
            </Pressable>;
          })}
          {!!message && <Text style={styles.locationHelper}>{message}</Text>}
        </View>
      ) : null}
      {!!message && !(focused && value.trim().length >= 3) && <Text style={styles.locationHelper}>{message}</Text>}
      <Text style={styles.locationAttribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}
