//! Store lowercase UUID filenames and recover their plain, masked and sentinel identities.
use std::{fs, io};
use uuid_slug::{
    Alphabet, MigrationFormat, MigrationOptions, Uuid, UuidV7MaskingCodec,
    UuidV7MaskingCodecOptions, generation, public_mask,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let directory = std::env::temp_dir().join(format!("uuid-slug-{}", generation::uuid_v4()?));
    fs::create_dir(&directory)?;
    let result = exercise(&directory);
    let cleanup = fs::remove_dir_all(&directory);
    result?;
    cleanup?;
    println!("Plain, masked and sentinel filenames retained their spelling and identity");
    Ok(())
}

fn exercise(directory: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
        slug_alphabet: Alphabet::Base32Hex,
        ..UuidV7MaskingCodecOptions::new(public_mask())
    })?;
    let mut generator = generation::UuidV7Generator::new();
    let uuid = generator.generate()?;
    let mut cases = vec![
        (uuid.slug(Alphabet::Base32Hex), uuid),
        (codec.encode_uuid(uuid)?, uuid),
    ];
    // Cross digit boundaries; never infer chronology from directory enumeration order.
    let mut chronological = Vec::new();
    for timestamp in [31.0, 32.0, 1023.0, 1024.0, ((1_u64 << 42) - 1) as f64] {
        let id = generator.at(timestamp)?;
        let name = id.slug(Alphabet::Base32Hex);
        chronological.push(name.clone());
        cases.push((name, id));
    }
    cases.extend(
        codec
            .sentinels()
            .iter()
            .map(|entry| (entry.slug.clone(), entry.uuid)),
    );
    for (name, expected) in &cases {
        fs::write(directory.join(name), expected.to_string())?;
    }
    let reader = codec.migration_decoder(MigrationOptions {
        plain: true,
        ..MigrationOptions::default()
    });
    let mut read = 0;
    let mut plain_names = Vec::new();
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let name = entry
            .file_name()
            .into_string()
            .map_err(|_| io::Error::other("Filename is not UTF-8"))?;
        let stored = Uuid::parse(&fs::read_to_string(entry.path())?)?;
        if chronological.contains(&name) {
            plain_names.push(name.clone());
        }
        let format = if name.len() == 26 {
            MigrationFormat::Plain
        } else {
            MigrationFormat::Current
        };
        if !cases
            .iter()
            .any(|(original, id)| *original == name && *id == stored)
            || reader.decode(&name, Some(format))? != stored
        {
            return Err(io::Error::other("Filename spelling or UUID identity changed").into());
        }
        read += 1;
    }
    if read != cases.len() {
        return Err(io::Error::other("The filesystem lost or merged an identifier").into());
    }
    plain_names.sort();
    if plain_names != chronological {
        return Err(io::Error::other("Plain filenames lost timestamp order").into());
    }
    Ok(())
}
