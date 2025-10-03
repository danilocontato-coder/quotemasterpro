import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationData {
  state: string;
  city: string;
  count: number;
  lat: number;
  lng: number;
  type: 'client' | 'supplier';
}

export const GeographicDistributionMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Buscar dados de localização de clientes
        const { data: clients } = await supabase
          .from('clients')
          .select('address')
          .eq('status', 'active');

        // Buscar dados de localização de fornecedores
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('state, city')
          .eq('status', 'active');

        // Processar e agrupar dados
        const locationMap = new Map<string, LocationData>();

        // Coordenadas de exemplo para principais estados brasileiros
        const stateCoords: Record<string, [number, number]> = {
          'SP': [-23.5505, -46.6333],
          'RJ': [-22.9068, -43.1729],
          'MG': [-19.9167, -43.9345],
          'BA': [-12.9714, -38.5014],
          'PR': [-25.4284, -49.2733],
          'RS': [-30.0346, -51.2177],
          'CE': [-3.7172, -38.5433],
          'PE': [-8.0476, -34.8770],
        };

        suppliers?.forEach(s => {
          if (s.state && s.city) {
            const key = `${s.state}-${s.city}`;
            const coords = stateCoords[s.state] || [-15.7801, -47.9292]; // Brasília default
            
            if (locationMap.has(key)) {
              const existing = locationMap.get(key)!;
              existing.count++;
            } else {
              locationMap.set(key, {
                state: s.state,
                city: s.city,
                count: 1,
                lat: coords[0],
                lng: coords[1],
                type: 'supplier'
              });
            }
          }
        });

        setLocations(Array.from(locationMap.values()));
      } catch (error) {
        console.error('Erro ao carregar localizações:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLocations();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || locations.length === 0) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-47.9292, -15.7801], // Brasília
      zoom: 4,
    });

    // Adicionar controles de navegação
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Adicionar marcadores
    locations.forEach(location => {
      const marker = new mapboxgl.Marker({
        color: location.type === 'client' ? '#003366' : '#ff6b6b'
      })
        .setLngLat([location.lng, location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(
              `<div class="p-2">
                <h3 class="font-bold">${location.city}, ${location.state}</h3>
                <p class="text-sm">${location.count} ${location.type === 'client' ? 'cliente(s)' : 'fornecedor(es)'}</p>
              </div>`
            )
        )
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, locations]);

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Distribuição Geográfica
          </CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Distribuição Geográfica
        </CardTitle>
        <CardDescription>
          {locations.length} localizações mapeadas em todo Brasil
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!mapboxToken ? (
          <div className="h-96 flex flex-col items-center justify-center bg-muted rounded-lg">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Configure sua chave Mapbox para visualizar o mapa
            </p>
            <input
              type="text"
              placeholder="Cole sua chave pública Mapbox aqui"
              className="border rounded px-4 py-2 w-80"
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Obtenha em: <a href="https://mapbox.com" target="_blank" className="text-primary hover:underline">mapbox.com</a>
            </p>
          </div>
        ) : (
          <div ref={mapContainer} className="h-96 rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
};
