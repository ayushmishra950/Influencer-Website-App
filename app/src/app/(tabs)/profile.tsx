import { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Avatar, Banner, Button, Card, Chip, Loader, Txt } from '@/components/ui';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { PackageCard } from '@/components/PackageCard';
import { PackageSheet } from '@/components/PackageSheet';
import { useMyPackages } from '@/hooks/usePackages';
import type { Package } from '@/lib/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, request, uploadImage } from '@/lib/api';
import { formatDate, locationLine, socialUrl } from '@/lib/format';
import { Radius, Spacing } from '@/theme/tokens';
import type { MyProfile } from '@/lib/types';
import { useTheme } from '@/context/ThemeContext';

export default function ProfileScreen() {
  const { colors: Colors, statusStyle: STATUS_STYLE } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, logout, refreshProfile, setProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const { packages, limit, loading: loadingPackages, refresh: refreshPackages, save: savePackage, remove: removePackage } = useMyPackages();
  const [packageSheet, setPackageSheet] = useState<{ open: boolean; editing: Package | null }>({
    open: false,
    editing: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // The tab group requires a session, so the only gap here is the moment between
  // sign-in and the profile arriving.
  if (!user || !profile) return <Loader label="Loading your profile" />;

  const status = profile.isArchived ? 'archived' : profile.status;
  const statusStyle = STATUS_STYLE[status];
  // The whole profile has to be live before anything on it can be seen.
  const profileIsPublic = profile.status === 'approved' && !profile.isArchived;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refreshProfile(), refreshPackages()]);
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  async function onChangePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      // Upload first, then persist the returned path on the profile.
      const url = await uploadImage(result.assets[0].uri);
      const { data } = await request<{ data: MyProfile }>('/api/influencer/profile', {
        method: 'PUT',
        body: { profileImage: url },
      });
      setProfile(data);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not update your photo'));
    } finally {
      setUploading(false);
    }
  }


  function confirmRemovePackage(item: Package) {
    Alert.alert(
      'Remove this package?',
      `"${item.title}" will be deleted from your profile. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void removePackage(item._id).catch((err) =>
              setError(errorMessage(err, 'Could not remove this package')),
            );
          },
        },
      ],
    );
  }

  function onSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  const instagram = socialUrl('instagram', profile.social?.instagram);
  const youtube = socialUrl('youtube', profile.social?.youtube);

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingTop: insets.top + Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.violet400} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt variant="h1">My profile</Txt>
          <ThemeToggle />
        </View>

        {!!error && <Banner tone="error" message={error} />}

        {/* The verification state is the most important thing on this screen. */}
        <Card style={{ padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center' }}>
          <Pressable onPress={onChangePhoto} disabled={uploading} style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Avatar name={profile.name} src={profile.profileImage} size={92} />
            <Txt variant="small" color={Colors.violet400}>
              {uploading ? 'Uploading…' : profile.profileImage ? 'Change photo' : 'Add photo'}
            </Txt>
          </Pressable>

          <View style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Txt variant="h2">{profile.name}</Txt>
            <Txt variant="small" color={Colors.text3}>{profile.email}</Txt>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
              {!!profile.category && <Chip label={profile.category.name} />}
              <Chip label={statusStyle.label} color={statusStyle.color} bg={statusStyle.bg} />
            </View>
          </View>

          <Button label="Edit profile" variant="ghost" onPress={() => setEditing(true)} style={{ alignSelf: 'stretch' }} />
        </Card>

        {status === 'pending' && (
          <Banner
            tone="warn"
            title="Under review"
            message="Your profile is with our verification team. You will appear in the directory once it is approved."
          />
        )}
        {status === 'rejected' && (
          <Banner
            tone="error"
            title="Not approved"
            message={profile.rejectionReason || 'Your registration was not approved. Please contact support for details.'}
          />
        )}
        {status === 'archived' && (
          <Banner
            tone="info"
            title="Archived"
            message="Your account has been archived and is hidden from the directory. Contact support to restore it."
          />
        )}
        {status === 'approved' && (
          <Banner
            tone="success"
            title="Live in the directory"
            message="Brands browsing Aura can find and contact you."
          />
        )}

        <Card style={{ padding: Spacing.lg, gap: Spacing.sm }}>
          <Txt variant="h3">About</Txt>
          <Txt variant="body" color={profile.bio ? Colors.text2 : Colors.text3} style={{ lineHeight: 22 }}>
            {profile.bio || 'No bio yet. Tap Edit profile to tell brands what you create.'}
          </Txt>
        </Card>

        <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <Txt variant="h3">Details</Txt>
          <Row label="Phone" value={profile.phone || '—'} />
          <Row label="Location" value={locationLine(profile.location) || '—'} />
          <Row label="Category" value={profile.category?.name ?? '—'} />
          <Row label="Member since" value={formatDate(profile.createdAt)} />
        </Card>

        <Card style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <Txt variant="h3">Social accounts</Txt>
          <Row
            label="Instagram"
            value={profile.social?.instagram || 'Not added'}
            onPress={instagram ? () => void Linking.openURL(instagram) : undefined}
          />
          <Row
            label="YouTube"
            value={profile.social?.youtube || 'Not added'}
            onPress={youtube ? () => void Linking.openURL(youtube) : undefined}
          />
        </Card>

        {/* Packages: what this creator sells, and for how much. Each one is reviewed
            before it reaches the public profile, so the status is shown here. */}
        <View style={{ gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 1 }}>
              <Txt variant="h3">Packages</Txt>
              <Txt variant="tiny" color={Colors.text3}>
                {packages.length}/{limit} · what you charge, and for what
              </Txt>
            </View>
            {packages.length < limit && (
              <Pressable
                onPress={() => setPackageSheet({ open: true, editing: null })}
                hitSlop={8}
                accessibilityLabel="Add package"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.violet400} />
                  <Txt variant="small" color={Colors.violet400}>Add</Txt>
                </View>
              </Pressable>
            )}
          </View>

          {/* An approved package on a profile that is not itself public is invisible.
              Say so once, here, rather than letting each card imply otherwise. */}
          {!profileIsPublic && packages.some((p) => p.status === 'approved') && (
            <Banner
              tone="warn"
              title="Your packages are not public yet"
              message="Some of your packages are approved, but your profile is not in the public directory, so nobody can see them. They go live as soon as your profile is approved."
            />
          )}

          {loadingPackages ? (
            <Loader label="Loading packages" fill={false} />
          ) : packages.length === 0 ? (
            <Card style={{ padding: Spacing.lg, gap: Spacing.sm, alignItems: 'center' }}>
              <Ionicons name="pricetags-outline" size={22} color={Colors.text3} />
              <Txt variant="small" color={Colors.text2} center style={{ lineHeight: 19 }}>
                Add what you offer and what it costs — a reel, a story set, a video
                integration. Brands see this on your profile once it is approved.
              </Txt>
              <Button
                label="Add your first package"
                variant="ghost"
                onPress={() => setPackageSheet({ open: true, editing: null })}
                style={{ alignSelf: 'stretch' }}
              />
            </Card>
          ) : (
            packages.map((item) => (
              <PackageCard
                key={item._id}
                item={item}
                profileIsPublic={profileIsPublic}
                onEdit={() => setPackageSheet({ open: true, editing: item })}
                onDelete={() => confirmRemovePackage(item)}
              />
            ))
          )}
        </View>

        <Pressable onPress={() => router.push('/about')} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <Card style={{ padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.violet400} />
            <Txt variant="bodyStrong" style={{ flex: 1 }}>About Aura</Txt>
            <Ionicons name="chevron-forward" size={18} color={Colors.text3} />
          </Card>
        </Pressable>

        <Button label="Sign out" variant="danger" onPress={onSignOut} />
      </ScrollView>

      <PackageSheet
        visible={packageSheet.open}
        editing={packageSheet.editing}
        onClose={() => setPackageSheet({ open: false, editing: null })}
        onSave={savePackage}
      />

      <EditProfileSheet
        visible={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setProfile(updated);
          setEditing(false);
        }}
      />
    </>
  );

  function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
    const body = (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: Colors.line,
        }}
      >
        <Txt variant="small" color={Colors.text3}>{label}</Txt>
        <Txt variant="small" color={onPress ? Colors.violet400 : Colors.text} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Txt>
      </View>
    );
    return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
  }
}

