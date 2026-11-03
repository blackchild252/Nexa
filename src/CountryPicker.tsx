import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NexaPressable } from './motion';
import { theme, ds } from './theme';
import { s } from './styles';
import { NEXA_COUNTRIES, type NexaCountry } from './countries';
import { countryFlag, getCountryMetadata, getLocalizedCountryName } from './regionalization';

type Props = {
  value?: string;
  onSelect: (country: NexaCountry) => void;
  valueMode?: 'code' | 'name';
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  locale?: string;
};

export function CountryPicker({ value = '', onSelect, valueMode = 'name', label = 'Country', placeholder = 'Select your country', disabled = false, locale = 'en' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalized = String(value || '').trim().toLowerCase();
  const selected = NEXA_COUNTRIES.find(c => valueMode === 'code' ? c.code.toLowerCase() === normalized : c.name.toLowerCase() === normalized);
  const sortedCountries = useMemo(() => [...NEXA_COUNTRIES].sort((a,b) => getLocalizedCountryName(a, locale).localeCompare(getLocalizedCountryName(b, locale), locale)), [locale]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/[^0-9]/g, '');
    return q ? sortedCountries.filter(c => c.name.toLowerCase().indexOf(q) >= 0 || getLocalizedCountryName(c, locale).toLowerCase().indexOf(q) >= 0 || c.code.toLowerCase() === q || (digits.length > 0 && String(getCountryMetadata(c.code).callingCode || '').replace(/[^0-9]/g,'').indexOf(digits) >= 0)) : sortedCountries;
  }, [query, sortedCountries]);

  const close = () => { setOpen(false); setQuery(''); };
  const choose = (country: NexaCountry) => { onSelect(country); close(); };

  return <>
    <View>
      <Text style={s.muted}>{label}</Text>
      <NexaPressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? `${countryFlag(selected.code)} ${getLocalizedCountryName(selected, locale)}` : placeholder}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={ds({ minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surface })}
      >
        <Text style={ds({ flex: 1, color: selected ? theme.colors.text : theme.colors.muted, fontWeight: selected ? '700' : '500' })}>{selected ? `${countryFlag(selected.code)} ${getLocalizedCountryName(selected, locale)}` : placeholder}</Text>
        {selected ? <Text style={ds({ color: theme.colors.muted, marginRight: 8, fontWeight: '800' })}>{selected.code}</Text> : null}
        <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
      </NexaPressable>
    </View>

    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <View style={ds({ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' })}>
        <View style={ds({ maxHeight: '88%', backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: theme.colors.border, paddingTop: 14, paddingBottom: 10 })}>
          <View style={ds({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10 })}>
            <View style={ds({ flex: 1 })}>
              <Text style={s.section}>{label}</Text>
              <Text style={s.muted}>Choose from all supported countries and territories.</Text>
            </View>
            <NexaPressable accessibilityRole="button" accessibilityLabel={`Close ${label} list`} onPress={close} style={ds({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' })}>
              <Ionicons name="close" size={23} color={theme.colors.text} />
            </NexaPressable>
          </View>
          <View style={ds({ paddingHorizontal: 18, paddingBottom: 8 })}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`Search ${label}`}
              placeholder="Search country"
              placeholderTextColor={theme.colors.muted}
              style={ds({ minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 13, color: theme.colors.text, backgroundColor: theme.colors.surfaceElevated })}
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={ds({ paddingBottom: 20 })}>
            {filtered.map(country => {
              const isSelected = valueMode === 'code' ? country.code.toLowerCase() === normalized : country.name.toLowerCase() === normalized;
              return <NexaPressable
                key={country.code}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Select ${country.name}`}
                onPress={() => choose(country)}
                style={ds({ minHeight: 58, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' })}
              >
                <View style={ds({ flex: 1, paddingRight: 10 })}>
                  <Text style={ds({ color: theme.colors.text, fontSize: 16, fontWeight: '800', textTransform: 'uppercase' })}>{country.name}</Text>
                  <Text style={ds({ color: theme.colors.muted, marginTop: 2, fontSize: 14, fontWeight: '700' })}>{country.code}{getCountryMetadata(country.code).callingCode ? ` · +${getCountryMetadata(country.code).callingCode}` : ''}{getCountryMetadata(country.code).localCurrency ? ` · ${getCountryMetadata(country.code).localCurrency}` : ''}{getCountryMetadata(country.code).region ? ` · ${getCountryMetadata(country.code).region}` : ''}</Text>
                </View>
                <View style={ds({ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: isSelected ? theme.colors.goldBright : theme.colors.muted, alignItems: 'center', justifyContent: 'center' })}>
                  {isSelected ? <View style={ds({ width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.goldBright })} /> : null}
                </View>
              </NexaPressable>;
            })}
            {!filtered.length ? <Text style={ds({ color: theme.colors.muted, textAlign: 'center', padding: 24 })}>No country matches “{query}”.</Text> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
