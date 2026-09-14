/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { useState } from 'react';
import { Banner, Button, Space, Spin, Tag, Typography } from '@douyinfe/semi-ui-19';
import { IconMapPin, IconShield, IconRefresh } from '@douyinfe/semi-icons';
import { xhrGet } from '../../services/xhr.js';
import { useTranslation } from '../../services/i18n/i18n.jsx';

import './CscSitingScreen.less';

const { Text } = Typography;

/**
 * A deliberately conservative, on-demand first pass for potential CSC premises.
 * The legal decision remains a manual site and authority check; OSM's location
 * is useful triage data but does not reliably represent a facility entrance.
 */
export default function CscSitingScreen({ listingId }) {
  const t = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runScreen() {
    setLoading(true);
    try {
      const { json } = await xhrGet(`/api/listings/${listingId}/csc-siting`);
      setResult(json);
    } catch {
      setResult({ status: 'unavailable' });
    } finally {
      setLoading(false);
    }
  }

  const type = result?.status === 'reviewRequired' ? 'warning' : result?.status === 'clearOnMapScreen' ? 'success' : 'info';

  return (
    <section className="csc-siting-screen" aria-label={t('oikos.csc.title')}>
      <div className="csc-siting-screen__head">
        <Space align="center">
          <IconShield aria-hidden="true" />
          <Text strong>{t('oikos.csc.title')}</Text>
        </Space>
        <Button size="small" theme={result ? 'borderless' : 'solid'} type={result ? 'tertiary' : 'primary'} loading={loading} onClick={runScreen} icon={result ? <IconRefresh /> : <IconMapPin />}>
          {result ? t('oikos.csc.refresh') : t('oikos.csc.run')}
        </Button>
      </div>
      <Text size="small" type="tertiary" className="csc-siting-screen__intro">
        {t('oikos.csc.intro')}
      </Text>
      {loading && (
        <div className="csc-siting-screen__loading">
          <Spin size="small" /> <Text size="small">{t('oikos.csc.loading')}</Text>
        </div>
      )}
      {result && !loading && (
        <Banner
          type={type}
          bordered
          closeIcon={null}
          title={t(`oikos.csc.status.${result.status}`)}
          description={
            <div>
              {result.status === 'reviewRequired' && (
                <div className="csc-siting-screen__matches">
                  {result.matches.map((match) => (
                    <Tag key={`${match.category}:${match.name}:${match.meters}`} color="orange">
                      {match.name} · {match.meters} m
                    </Tag>
                  ))}
                </div>
              )}
              <Text size="small" type="tertiary" className="csc-siting-screen__note">
                {t('oikos.csc.disclaimer')}
              </Text>
            </div>
          }
        />
      )}
    </section>
  );
}
