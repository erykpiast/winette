import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportError } from '#lib/error-reporting';
import type { ImageFormat } from '#types/shared';
import * as styles from './RenderedLabel.css';

export interface RenderedLabelProps {
  /** The URL of the rendered label image */
  previewUrl: string;
  /** Optional width of the image */
  width?: number;
  /** Optional height of the image */
  height?: number;
  /** The wine details for context */
  wineDetails: {
    producerName: string;
    wineName: string;
    vintage: string;
    region?: string | undefined;
    variety?: string | undefined;
  };
  /** Format of the image */
  format?: ImageFormat;
}

export function RenderedLabel({
  previewUrl,
  width,
  height,
  wineDetails,
  format = 'PNG',
}: RenderedLabelProps): ReactElement {
  const { t } = useTranslation();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);

  const handleImageLoad = () => {
    setIsImageLoading(false);
    setHasImageError(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setHasImageError(true);

    // Report image loading error to centralized error system
    reportError(new Error(`Failed to load wine label image: ${previewUrl}`), {
      source: 'RenderedLabel',
      additional: {
        imageUrl: previewUrl,
        wineProducer: wineDetails.producerName,
        wineName: wineDetails.wineName,
      },
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${wineDetails.producerName.replace(/\s+/g, '_')}_${wineDetails.wineName.replace(/\s+/g, '_')}_${wineDetails.vintage}.${format.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (hasImageError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p className={styles.errorMessage}>{t('renderedLabel.error.failed')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('renderedLabel.title')}</h3>
        <p className={styles.subtitle}>
          {wineDetails.producerName} • {wineDetails.wineName} • {wineDetails.vintage}
        </p>
      </div>

      <div className={styles.imageContainer}>
        {isImageLoading && (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} aria-hidden="true" />
            <p className={styles.loadingText}>{t('renderedLabel.loading')}</p>
          </div>
        )}

        <img
          src={previewUrl}
          alt={t('renderedLabel.alt', {
            producer: wineDetails.producerName,
            wine: wineDetails.wineName,
          })}
          className={styles.labelImage}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            display: isImageLoading ? 'none' : 'block',
            width: width ? `${width}px` : 'auto',
            height: height ? `${height}px` : 'auto',
          }}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={handleDownload}
          className={styles.downloadButton}
          disabled={isImageLoading || hasImageError}
        >
          {t('renderedLabel.download')}
        </button>
      </div>

      <div className={styles.details}>
        <p className={styles.detailsText}>
          {t('renderedLabel.details.dimensions')}: {width || '?'} × {height || '?'} • {format}
        </p>
        {wineDetails.region && (
          <p className={styles.detailsText}>
            {t('renderedLabel.details.region')}: {wineDetails.region}
          </p>
        )}
        {wineDetails.variety && (
          <p className={styles.detailsText}>
            {t('renderedLabel.details.variety')}: {wineDetails.variety}
          </p>
        )}
      </div>
    </div>
  );
}
