import { useRef, useState } from 'react';
import { safeImg } from '../../domain/format';
import type { Item } from '../../domain/types';
import { attachPhoto, removePhoto } from '../../store/actions';
import { useAppStore } from '../../store/appStore';
import { CameraIcon } from '../icons';

export function PhotoField({ id, item }: { id: string; item: Item }) {
  const uploading = useAppStore((s) => s.uploading === id);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const filePicker = (
    <input
      ref={picker}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (f) void attachPhoto(id, f);
      }}
    />
  );
  const pick = () => picker.current?.click();

  if (uploading) {
    return (
      <div className="photo-drop">
        <CameraIcon />
        Fotoğraf yükleniyor…
      </div>
    );
  }

  if (safeImg(item.img)) {
    return (
      <>
        <div className="photo-prev">
          <img alt={item.name} src={item.img} />
        </div>
        <div className="photo-acts">
          <button type="button" className="btn" onClick={pick}>
            Değiştir
          </button>
          <button type="button" className="btn danger" onClick={() => removePhoto(id)}>
            Kaldır
          </button>
        </div>
        {filePicker}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={'photo-drop' + (over ? ' over' : '')}
        onClick={pick}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={() => setOver(false)}
      >
        <CameraIcon />
        Fotoğraf ekle<span style={{ fontSize: 12, color: 'var(--ink-3)' }}>ya da görseli buraya sürükle</span>
      </button>
      {filePicker}
    </>
  );
}
