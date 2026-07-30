import React from 'react';
import {
  Agency,
  CareerListElement,
  FooterElement,
  LinksElement,
  PhotoElement,
  PhotoMeta,
  Talent,
  Template,
  TemplateElement,
  TextElement,
  TextStyle,
} from '../types';
import { formatCareer, resolveBinding } from '../model';

export const PX_PER_MM = 96 / 25.4;

function textStyleCss(s: TextStyle): React.CSSProperties {
  return {
    fontFamily:
      s.font === 'serif'
        ? '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif'
        : '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif',
    fontSize: `${s.size}pt`,
    fontWeight: s.bold ? 700 : 400,
    color: s.color ?? '#111',
    textAlign: s.align ?? 'left',
    lineHeight: s.lineHeight ?? 1.35,
  };
}

function rectCss(el: TemplateElement): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${el.rect.x}mm`,
    top: `${el.rect.y}mm`,
    width: `${el.rect.w}mm`,
    height: `${el.rect.h}mm`,
    zIndex: el.z ?? 1,
  };
}

function TextEl({ el, talent }: { el: TextElement; talent: Talent }) {
  if (el.binding === 'name_full') {
    return (
      <div style={{ ...rectCss(el), ...textStyleCss(el.style), whiteSpace: 'nowrap' }}>
        <span>{talent.stage_name || '（氏名未入力）'}</span>
        {talent.romaji && (
          <span style={{ fontSize: `${Math.round(el.style.size * 0.55)}pt`, marginLeft: '0.5em' }}>
            {talent.romaji}
          </span>
        )}
      </div>
    );
  }
  const content = el.binding ? resolveBinding(el.binding, talent) : (el.text ?? '');
  return (
    <div style={{ ...rectCss(el), ...textStyleCss(el.style), whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
      {content}
    </div>
  );
}

function PhotoEl({
  el,
  talent,
  photos,
  blobUrl,
}: {
  el: PhotoElement;
  talent: Talent;
  photos: PhotoMeta[];
  blobUrl: (id?: string) => string | undefined;
}) {
  const photoId = talent.photo_slots[el.slot];
  const meta = photos.find((p) => p.id === photoId);
  const url = blobUrl(photoId);
  if (!meta || !url) {
    return (
      <div
        className="photo-placeholder"
        style={{
          ...rectCss(el),
          background: '#f0f0f0',
          border: '1px dashed #bbb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '9pt',
          fontFamily: 'sans-serif',
        }}
      >
        写真未設定
      </div>
    );
  }
  return (
    <div style={{ ...rectCss(el), overflow: 'hidden' }}>
      <img
        src={url}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${meta.crop.x}% ${meta.crop.y}%`,
          transform: meta.crop.zoom !== 1 ? `scale(${meta.crop.zoom})` : undefined,
          transformOrigin: `${meta.crop.x}% ${meta.crop.y}%`,
          display: 'block',
        }}
      />
    </div>
  );
}

function CareerListEl({ el, talent }: { el: CareerListElement; talent: Talent }) {
  return (
    <div style={{ ...rectCss(el), ...textStyleCss(el.style), overflow: 'hidden' }}>
      {el.categories.map((cat) => {
        const items = talent.careers.filter((c) => c.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: '1.2mm' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5mm' }}>【{cat}】</div>
            {items.map((c) => (
              <div
                key={c.id}
                style={{
                  whiteSpace: 'pre-wrap',
                  color: c.is_highlight ? el.highlightColor : undefined,
                  fontWeight: c.is_highlight ? 700 : undefined,
                }}
              >
                {formatCareer(c)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function LinksEl({ el, talent }: { el: LinksElement; talent: Talent }) {
  return (
    <div
      style={{
        ...rectCss(el),
        ...textStyleCss(el.style),
        border: el.bordered ? '0.3mm solid #333' : undefined,
        padding: '1.5mm 2mm',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.5mm' }}>【動画資料】</div>
      {talent.video_links.map((l) => (
        <div key={l.id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.label}
          <a href={l.url} style={{ color: '#1155cc' }}>
            {l.url}
          </a>
        </div>
      ))}
    </div>
  );
}

function FooterEl({
  el,
  agency,
  blobUrl,
}: {
  el: FooterElement;
  agency: Agency;
  blobUrl: (id?: string) => string | undefined;
}) {
  const logo = blobUrl(agency.logoBlobId);
  return (
    <div
      style={{
        ...rectCss(el),
        ...textStyleCss(el.style),
        display: 'flex',
        alignItems: 'center',
        gap: '3mm',
        borderTop: '0.3mm solid #333',
        paddingTop: '1.2mm',
        boxSizing: 'border-box',
      }}
    >
      {logo && <img src={logo} alt="" style={{ height: '80%', maxWidth: '30mm', objectFit: 'contain' }} />}
      <span style={{ fontWeight: 700, fontSize: '1.25em', whiteSpace: 'nowrap' }}>{agency.name}</span>
      {agency.tel && <span style={{ whiteSpace: 'nowrap' }}>☎ {agency.tel}</span>}
      <span style={{ fontSize: '0.9em', lineHeight: 1.4 }}>
        {agency.address && <span>{agency.address}　</span>}
        {agency.email && (
          <a href={`mailto:${agency.email}`} style={{ color: '#1155cc' }}>
            {agency.email}
          </a>
        )}
        {agency.website && (
          <>

            <a href={agency.website} style={{ color: '#1155cc' }}>
              {agency.website}
            </a>
          </>
        )}
      </span>
    </div>
  );
}

export function ElementView({
  el,
  talent,
  agency,
  photos,
  blobUrl,
}: {
  el: TemplateElement;
  talent: Talent;
  agency: Agency;
  photos: PhotoMeta[];
  blobUrl: (id?: string) => string | undefined;
}) {
  switch (el.type) {
    case 'text':
      return <TextEl el={el} talent={talent} />;
    case 'photo':
      return <PhotoEl el={el} talent={talent} photos={photos} blobUrl={blobUrl} />;
    case 'career_list':
      return <CareerListEl el={el} talent={talent} />;
    case 'line':
      return <div style={{ ...rectCss(el), background: el.color ?? '#333' }} />;
    case 'links':
      return <LinksEl el={el} talent={talent} />;
    case 'footer':
      return <FooterEl el={el} agency={agency} blobUrl={blobUrl} />;
  }
}

// A4実寸のプロフィール1枚。エディタ/プレビュー/印刷(PDF)で共用し「見たまま出力」を保証する
export function ProfilePage({
  template,
  talent,
  agency,
  photos,
  blobUrl,
}: {
  template: Template;
  talent: Talent;
  agency: Agency;
  photos: PhotoMeta[];
  blobUrl: (id?: string) => string | undefined;
}) {
  return (
    <div
      className="profile-page"
      style={{
        position: 'relative',
        width: `${template.page.w}mm`,
        height: `${template.page.h}mm`,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {template.elements.map((el) => (
        <ElementView key={el.id} el={el} talent={talent} agency={agency} photos={photos} blobUrl={blobUrl} />
      ))}
    </div>
  );
}
