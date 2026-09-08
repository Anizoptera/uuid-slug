//! Store lowercase UUID filenames and recover their plain, masked and sentinel identities.
use std::{fs, io};
use uuid_slug::{
    Alphabet, Codec, CodecOptions, MigrationFormat, MigrationOptions, Uuid, generation,
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
    let codec = Codec::new(CodecOptions {
        slug_alphabet: Alphabet::Base32Hex,
        masked_slug_alphabet: Alphabet::Base32Hex,
        ..CodecOptions::default()
    })?;
    let mut generator = generation::UuidV7Generator::new();
    let uuid = generator.generate()?;
    let mut cases = vec![
        (codec.uuid_to_slug(uuid), uuid),
        (codec.uuid_v7_to_masked_slug(uuid)?, uuid),
    ];
    cases.extend(
        codec
            .sentinels()
            .iter()
            .map(|entry| (entry.slug.clone(), entry.uuid)),
    );
    for (name, expected) in &cases {
        fs::write(directory.join(name), expected.to_string())?;
    }
    let reader = codec.migration(MigrationOptions {
        plain: true,
        ..MigrationOptions::default()
    });
    let mut read = 0;
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let name = entry
            .file_name()
            .into_string()
            .map_err(|_| io::Error::other("Filename is not UTF-8"))?;
        let stored = Uuid::parse(&fs::read_to_string(entry.path())?)?;
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
    Ok(())
}
